<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Period;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PeriodExpenseSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_named_expenses_in_period_keep_separate_rows_without_frontend_suffix(): void
    {
        $user = User::factory()->create();
        $period = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-31',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);
        $nextPeriod = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-30',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);

        $this->actingAs($user)
            ->putJson("/api/periods/{$period->id}", [
                'expenses' => [
                    [
                        'name' => 'Коммуналка',
                        'planned_amount' => 12000,
                        'actual_amount' => 11800,
                    ],
                    [
                        'name' => 'Коммуналка',
                        'planned_amount' => 3000,
                        'actual_amount' => 2800,
                    ],
                ],
            ])
            ->assertNoContent();

        $storedNames = Expense::query()
            ->where('type', 'mandatory')
            ->orderBy('name')
            ->pluck('name')
            ->all();

        $this->assertSame(['Коммуналка', 'Коммуналка--1'], $storedNames);

        $showResponse = $this->actingAs($user)
            ->getJson("/api/periods/{$period->id}")
            ->assertOk();

        $this->assertSame(
            ['Коммуналка', 'Коммуналка'],
            array_column($showResponse->json('data.expenses'), 'name'),
        );

        $suggestionsResponse = $this->actingAs($user)
            ->getJson("/api/periods/{$nextPeriod->id}/expense-suggestions?type=mandatory")
            ->assertOk();

        $this->assertSame(
            ['Коммуналка'],
            $suggestionsResponse->json('data.all'),
        );
    }

    public function test_hidden_suggestions_are_user_scoped_and_reenabled_after_manual_reuse(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $hiddenSourcePeriod = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-31',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);
        $currentPeriod = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-02-01',
            'end_date' => '2026-02-28',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);
        $otherPeriod = Period::create([
            'user_id' => $otherUser->id,
            'start_date' => '2026-02-01',
            'end_date' => '2026-02-28',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);

        $expense = Expense::create([
            'name' => 'Зал',
            'type' => 'mandatory',
        ]);

        $hiddenSourcePeriod->expenses()->attach($expense->id, [
            'planned_amount' => 2500,
            'actual_amount' => 2500,
            'exclude_from_suggestions' => false,
        ]);
        $otherPeriod->expenses()->attach($expense->id, [
            'planned_amount' => 2500,
            'actual_amount' => 2500,
            'exclude_from_suggestions' => false,
        ]);

        $this->actingAs($user)
            ->getJson("/api/periods/{$currentPeriod->id}/expense-suggestions?type=mandatory")
            ->assertOk()
            ->assertJsonPath('data.all.0', 'Зал');

        $this->actingAs($user)
            ->deleteJson("/api/periods/{$currentPeriod->id}/expense-suggestions", [
                'type' => 'mandatory',
                'name' => 'Зал',
            ])
            ->assertNoContent();

        $this->actingAs($user)
            ->getJson("/api/periods/{$currentPeriod->id}/expense-suggestions?type=mandatory")
            ->assertOk()
            ->assertJsonPath('data.all', []);

        $this->actingAs($otherUser)
            ->getJson("/api/periods/{$otherPeriod->id}/expense-suggestions?type=mandatory")
            ->assertOk()
            ->assertJsonPath('data.all.0', 'Зал');

        $this->actingAs($user)
            ->putJson("/api/periods/{$currentPeriod->id}", [
                'expenses' => [
                    [
                        'name' => 'Зал',
                        'planned_amount' => 2500,
                        'actual_amount' => 2600,
                    ],
                ],
            ])
            ->assertNoContent();

        $this->actingAs($user)
            ->getJson("/api/periods/{$currentPeriod->id}/expense-suggestions?type=mandatory")
            ->assertOk()
            ->assertJsonPath('data.all.0', 'Зал');

        $this->assertFalse(
            (bool) DB::table('period_expense')
                ->where('period_id', $currentPeriod->id)
                ->where('expense_id', $expense->id)
                ->value('exclude_from_suggestions'),
        );
    }
}
