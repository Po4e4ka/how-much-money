<?php

namespace App\Http\Controllers;

use App\Models\Period;
use Carbon\Carbon;
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

        $incomeTotal = $period->expenses
            ->where('type', 'income')
            ->sum(function ($expense) {
                return $expense->pivot->actual_amount;
            });

        return response()->json([
            'data' => [
                'id' => $period->id,
                'start_date' => $period->start_date,
                'end_date' => $period->end_date,
                'daily_expenses' => $period->daily_expenses ?? [],
                'income_total' => $incomeTotal,
                'expenses' => $period->expenses->map(function ($expense) {
                    return [
                        'id' => $expense->id,
                        'name' => $expense->name,
                        'type' => $expense->type,
                        'planned_amount' => $expense->pivot->planned_amount,
                        'actual_amount' => $expense->pivot->actual_amount,
                    ];
                })->values(),
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
            ],
        ], 201);
    }
}
