<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Period;
use App\Models\Viewer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class PeriodController extends Controller
{
    private function resolveOwnerId(Request $request, ?Period $period = null): int
    {
        $viewerId = $request->query('viewer_id');
        $userId = $request->user()->id;

        if ($viewerId === null) {
            if ($period && $period->user_id !== $userId) {
                abort(403);
            }
            return $userId;
        }

        $viewerId = (int) $viewerId;

        $hasAccess = Viewer::query()
            ->where('user_id', $viewerId)
            ->where('viewer_id', $userId)
            ->where('status', Viewer::STATUS_ACTIVE)
            ->exists();

        if (! $hasAccess) {
            abort(403);
        }

        if ($period && $period->user_id !== $viewerId) {
            abort(403);
        }

        return $viewerId;
    }
    public function index(Request $request)
    {
        $periods = Period::query()
            ->where('user_id', $this->resolveOwnerId($request))
            ->orderByDesc('start_date')
            ->with([
                'expenses' => function ($query) {
                    $query->select('expenses.id', 'expenses.type')
                        ->withPivot(['planned_amount', 'actual_amount']);
                },
            ])
            ->get([
                'id',
                'user_id',
                'start_date',
                'end_date',
                'daily_expenses',
                'is_pinned',
                'is_closed',
            ]);

        $data = $periods->map(function (Period $period) {
            $payload = [
                'id' => $period->id,
                'user_id' => $period->user_id,
                'start_date' => $period->start_date?->toDateString(),
                'end_date' => $period->end_date?->toDateString(),
                'is_pinned' => (bool) $period->is_pinned,
                'is_closed' => (bool) $period->is_closed,
            ];

            if ($period->is_closed) {
                $payload['actual_remaining'] = $this->calculateActualRemaining($period);
            }

            return $payload;
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    public function show(Request $request, Period $period)
    {
        $this->resolveOwnerId($request, $period);

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
                'is_closed' => (bool) $period->is_closed,
                'incomes' => $incomes,
                'expenses' => $mandatoryExpenses,
                'external_expenses' => $externalExpenses,
            ],
        ]);
    }

    public function expenseSuggestions(Request $request, Period $period)
    {
        $userId = $this->resolveOwnerId($request, $period);
        $type = $request->query('type');
        $allowedTypes = ['income', 'mandatory', 'external'];
        $types = in_array($type, $allowedTypes, true)
            ? [$type]
            : ['mandatory', 'external'];

        $previousPeriod = Period::query()
            ->where('user_id', $userId)
            ->where('id', '<', $period->id)
            ->orderByDesc('id')
            ->first();

        $previousNames = [];
        if ($previousPeriod) {
            $previousNames = $previousPeriod->expenses()
                ->whereIn('expenses.type', $types)
                ->select('expenses.name')
                ->distinct()
                ->orderBy('expenses.name')
                ->pluck('expenses.name')
                ->all();
        }

        $allNames = Expense::query()
            ->select('expenses.name')
            ->join('period_expense', 'expenses.id', '=', 'period_expense.expense_id')
            ->join('periods', 'periods.id', '=', 'period_expense.period_id')
            ->where('periods.user_id', $userId)
            ->whereIn('expenses.type', $types)
            ->distinct()
            ->orderBy('expenses.name')
            ->pluck('expenses.name')
            ->all();

        return response()->json([
            'data' => [
                'previous' => $previousNames,
                'all' => $allNames,
            ],
        ]);
    }

    public function store(Request $request)
    {
        if ($request->query('viewer_id') !== null) {
            abort(403);
        }

        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'daily_expenses' => ['nullable', 'array'],
            'force' => ['nullable', 'boolean'],
        ]);

        $force = (bool)($data['force'] ?? false);
        $startDate = Carbon::parse($data['start_date']);
        $endDate = Carbon::parse($data['end_date']);

        if ($endDate->gt($startDate->copy()->addMonthsNoOverflow(3))) {
            return response()->json([
                'message' => 'Диапазон не должен превышать 3 месяца.',
            ], 422);
        }

        $startDate = $startDate->toDateString();
        $maxDate = Carbon::parse($data['start_date'])->addDay()->toDateString();
        $endDate = $endDate->toDateString();
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
                'is_closed' => (bool) $period->is_closed,
            ],
        ], 201);
    }

    public function update(Request $request, Period $period)
    {
        if ($request->query('viewer_id') !== null) {
            abort(403);
        }

        if ($period->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($period->is_closed) {
            return response()->json([
                'message' => 'Период закрыт и больше не редактируется.',
            ], 423);
        }

        $data = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'daily_expenses' => ['nullable', 'array'],
            'force' => ['nullable', 'boolean'],
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

        $force = (bool)($data['force'] ?? false);

        if (isset($data['start_date']) && isset($data['end_date'])) {

            $startDate = Carbon::parse($data['start_date']);
            $endDate = Carbon::parse($data['end_date']);

            if ($endDate->gt($startDate->copy()->addMonthsNoOverflow(3))) {
                return response()->json([
                    'message' => 'Диапазон не должен превышать 3 месяца.',
                ], 422);
            }

            $startDate = $startDate->toDateString();
            $maxDate = Carbon::parse($data['start_date'])->addDay()->toDateString();
            $endDate = $endDate->toDateString();

            $overlap = Period::query()
                ->where('user_id', $request->user()->id)
                ->where('id', '!=', $period->id)
                ->where('start_date', '<', $endDate)
                ->where('end_date', '>=', $maxDate)
                ->orderBy('start_date')
                ->first();

            if ($overlap && ! $force) {
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

    public function close(Request $request, Period $period)
    {
        if ($request->query('viewer_id') !== null) {
            abort(403);
        }

        if ($period->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($period->is_closed) {
            return response()->json([
                'data' => [
                    'is_closed' => true,
                    'actual_remaining' => $this->calculateActualRemaining($period),
                ],
            ]);
        }

        if (! $this->hasAllDailyExpenses($period)) {
            return response()->json([
                'message' => 'Заполните ежедневные траты за все дни периода.',
            ], 422);
        }

        $period->is_closed = true;
        $period->save();

        return response()->json([
            'data' => [
                'is_closed' => true,
                'actual_remaining' => $this->calculateActualRemaining($period),
            ],
        ]);
    }

    public function pin(Request $request, Period $period)
    {
        if ($request->query('viewer_id') !== null) {
            abort(403);
        }

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
        if ($request->query('viewer_id') !== null) {
            abort(403);
        }

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

    private function hasAllDailyExpenses(Period $period): bool
    {
        $dailyExpenses = $period->daily_expenses ?? [];
        $startDate = $period->start_date?->copy();
        $endDate = $period->end_date?->copy();

        if (! $startDate || ! $endDate) {
            return false;
        }

        if ($startDate->gt($endDate)) {
            return false;
        }

        $days = $startDate->diffInDays($endDate);
        for ($i = 0; $i <= $days; $i++) {
            $key = $startDate->copy()->addDays($i)->toDateString();
            if (! array_key_exists($key, $dailyExpenses)) {
                return false;
            }
        }

        return true;
    }

    private function calculateActualRemaining(Period $period): int
    {
        $period->loadMissing([
            'expenses' => function ($query) {
                $query->select('expenses.id', 'expenses.type')
                    ->withPivot(['actual_amount']);
            },
        ]);

        $dailyTotal = array_sum($period->daily_expenses ?? []);

        $incomeTotal = $period->expenses
            ->where('type', 'income')
            ->sum(fn ($expense) => (int) $expense->pivot->actual_amount);

        $mandatoryActual = $period->expenses
            ->where('type', 'mandatory')
            ->sum(fn ($expense) => (int) $expense->pivot->actual_amount);

        return (int) ($incomeTotal - $mandatoryActual - $dailyTotal);
    }
}
