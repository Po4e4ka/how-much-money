<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Period;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class PeriodController extends Controller
{
    public function index(Request $request)
    {
        $periods = Period::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('start_date')
            ->get([
                'id',
                'user_id',
                'start_date',
                'end_date',
                'is_pinned',
            ]);

        return response()->json([
            'data' => $periods,
        ]);
    }

    public function show(Request $request, Period $period)
    {
        if ($period->user_id !== $request->user()->id) {
            abort(403);
        }

        $period->load([
            'expenses' => function ($query) {
                $query->select('expenses.id', 'expenses.name', 'expenses.type')
                    ->withPivot(['planned_amount', 'actual_amount']);
            }
        ]);

        $incomes = $period->expenses
            ->where('type', 'income')
            ->map(function ($expense) {
                return [
                    'id' => $expense->id,
                    'name' => $expense->name,
                    'amount' => $expense->pivot->actual_amount,
                ];
            })
            ->values();

        $mandatoryExpenses = $period->expenses
            ->where('type', 'mandatory')
            ->map(function ($expense) {
                return [
                    'id' => $expense->id,
                    'name' => $expense->name,
                    'planned_amount' => $expense->pivot->planned_amount,
                    'actual_amount' => $expense->pivot->actual_amount,
                ];
            })
            ->values();

        $externalExpenses = $period->expenses
            ->where('type', 'external')
            ->map(function ($expense) {
                return [
                    'id' => $expense->id,
                    'name' => $expense->name,
                    'amount' => $expense->pivot->actual_amount,
                ];
            })
            ->values();

        return response()->json([
            'data' => [
                'id' => $period->id,
                'start_date' => $period->start_date->toDateString(),
                'end_date' => $period->end_date->toDateString(),
                'daily_expenses' => $period->daily_expenses ?? [],
                'is_pinned' => (bool) $period->is_pinned,
                'incomes' => $incomes,
                'expenses' => $mandatoryExpenses,
                'external_expenses' => $externalExpenses,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'daily_expenses' => ['nullable', 'array'],
            'force' => ['nullable', 'boolean'],
        ]);

        $force = (bool)($data['force'] ?? false);
        $startDate = Carbon::parse($data['start_date'])->toDateString();
        $maxDate = Carbon::parse($data['start_date'])->addDay()->toDateString();
        $endDate = Carbon::parse($data['end_date'])->toDateString();
        $overlap = Period::query()
            ->where('user_id', $request->user()->id)
            ->where('start_date', '<', $endDate)
            ->where('end_date', '>=', $maxDate)
            ->orderBy('start_date')
            ->first();

        if ($overlap && !$force) {
            return response()->json([
                'message' => 'Период пересекается с существующим.',
                'overlap' => [
                    'id' => $overlap->id,
                    'start_date' => $overlap->start_date->toDateString(),
                    'end_date' => $overlap->end_date->toDateString(),
                ],
            ], 409);
        }

        $period = Period::create([
            'user_id' => $request->user()->id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'daily_expenses' => $data['daily_expenses'] ?? [],
        ]);

        return response()->json([
            'data' => [
                'id' => $period->id,
                'start_date' => $period->start_date->toDateString(),
                'end_date' => $period->end_date->toDateString(),
                'daily_expenses' => $period->daily_expenses ?? [],
                'is_pinned' => (bool) $period->is_pinned,
            ],
        ], 201);
    }

    public function update(Request $request, Period $period)
    {
        if ($period->user_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'daily_expenses' => ['nullable', 'array'],
            'incomes' => ['nullable', 'array'],
            'incomes.*.id' => ['nullable', 'integer'],
            'incomes.*.name' => ['required_with:incomes', 'string', 'max:255'],
            'incomes.*.amount' => ['required_with:incomes', 'integer', 'min:0'],
            'expenses' => ['nullable', 'array'],
            'expenses.*.id' => ['nullable', 'integer'],
            'expenses.*.name' => ['required_with:expenses', 'string', 'max:255'],
            'expenses.*.planned_amount' => ['required_with:expenses', 'integer', 'min:0'],
            'expenses.*.actual_amount' => ['required_with:expenses', 'integer', 'min:0'],
            'external_expenses' => ['nullable', 'array'],
            'external_expenses.*.id' => ['nullable', 'integer'],
            'external_expenses.*.name' => ['required_with:external_expenses', 'string', 'max:255'],
            'external_expenses.*.amount' => ['required_with:external_expenses', 'integer', 'min:0'],
        ]);

        if (isset($data['start_date']) && isset($data['end_date'])) {

            $startDate = Carbon::parse($data['start_date'])->toDateString();
            $maxDate = Carbon::parse($data['start_date'])->addDay()->toDateString();
            $endDate = Carbon::parse($data['end_date'])->toDateString();

            $overlap = Period::query()
                ->where('user_id', $request->user()->id)
                ->where('id', '!=', $period->id)
                ->where('start_date', '<', $endDate)
                ->where('end_date', '>=', $maxDate)
                ->orderBy('start_date')
                ->first();

            if ($overlap) {
                return response()->json([
                    'message' => 'Период пересекается с существующим.',
                    'overlap' => [
                        'id' => $overlap->id,
                        'start_date' => $overlap->start_date->toDateString(),
                        'end_date' => $overlap->end_date->toDateString(),
                    ],
                ], 409);
            }

            $period->start_date = $startDate;
            $period->end_date = $endDate;
        }

        if (array_key_exists('daily_expenses', $data)) {
            $period->daily_expenses = $data['daily_expenses'] ?? [];
        }

        $period->save();

        if (array_key_exists('incomes', $data)) {
            $this->syncExpensesByType(
                $period,
                $data['incomes'] ?? [],
                'income',
                fn ($item) => [
                    'planned_amount' => 0,
                    'actual_amount' => $item['amount'],
                ],
            );
        }

        if (array_key_exists('expenses', $data)) {
            $this->syncExpensesByType(
                $period,
                $data['expenses'] ?? [],
                'mandatory',
                fn ($item) => [
                    'planned_amount' => $item['planned_amount'],
                    'actual_amount' => $item['actual_amount'],
                ],
            );
        }

        if (array_key_exists('external_expenses', $data)) {
            $this->syncExpensesByType(
                $period,
                $data['external_expenses'] ?? [],
                'external',
                fn ($item) => [
                    'planned_amount' => 0,
                    'actual_amount' => $item['amount'],
                ],
            );
        }

        return response()->noContent();
    }

    public function pin(Request $request, Period $period)
    {
        if ($period->user_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'pinned' => ['required', 'boolean'],
            'force' => ['nullable', 'boolean'],
        ]);

        $force = (bool) ($data['force'] ?? false);
        $pin = (bool) $data['pinned'];

        if (! $pin) {
            $period->is_pinned = false;
            $period->save();

            return response()->json([
                'data' => [
                    'is_pinned' => false,
                ],
            ]);
        }

        $existingPinned = Period::query()
            ->where('user_id', $request->user()->id)
            ->where('is_pinned', true)
            ->where('id', '!=', $period->id)
            ->first();

        if ($existingPinned && ! $force) {
            return response()->json([
                'message' => 'Уже есть закрепленный период.',
                'pinned' => [
                    'id' => $existingPinned->id,
                    'start_date' => $existingPinned->start_date->toDateString(),
                    'end_date' => $existingPinned->end_date->toDateString(),
                ],
            ], 409);
        }

        DB::transaction(function () use ($request, $period) {
            Period::query()
                ->where('user_id', $request->user()->id)
                ->where('is_pinned', true)
                ->update(['is_pinned' => false]);

            $period->is_pinned = true;
            $period->save();
        });

        return response()->json([
            'data' => [
                'is_pinned' => true,
            ],
        ]);
    }

    public function destroy(Request $request, Period $period)
    {
        if ($period->user_id !== $request->user()->id) {
            abort(403);
        }

        DB::transaction(function () use ($period) {
            $period->expenses()->detach();
            $period->delete();
        });

        return response()->noContent();
    }

    private function syncExpensesByType(Period $period, array $items, string $type, callable $pivotResolver): void
    {
        $expenseIds = [];

        foreach ($items as $item) {
            $expense = null;

            if (!empty($item['id'])) {
                $expense = Expense::query()->find($item['id']);
            }

            if (!$expense) {
                $expense = Expense::create([
                    'name' => $item['name'],
                    'type' => $type,
                ]);
            } else {
                $expense->name = $item['name'];
                $expense->type = $type;
                $expense->save();
            }

            $expenseIds[$expense->id] = $pivotResolver($item);
        }

        $existingIds = $period->expenses()
            ->where('type', $type)
            ->pluck('expenses.id')
            ->all();

        $idsToDetach = array_diff($existingIds, array_keys($expenseIds));
        if ($idsToDetach) {
            $period->expenses()->detach($idsToDetach);
        }

        foreach ($expenseIds as $expenseId => $pivot) {
            $period->expenses()->syncWithoutDetaching([
                $expenseId => $pivot,
            ]);
        }
    }
}
