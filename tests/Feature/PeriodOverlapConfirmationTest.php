<?php

namespace Tests\Feature;

use App\Models\Period;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PeriodOverlapConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_an_overlapping_period_requires_confirmation(): void
    {
        $user = User::factory()->create();
        $existing = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-15',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);

        $dates = [
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-20',
        ];

        $this->actingAs($user)
            ->postJson('/api/periods', $dates)
            ->assertStatus(409)
            ->assertJsonPath('overlap.id', $existing->id);

        $this->actingAs($user)
            ->postJson('/api/periods', [...$dates, 'force' => true])
            ->assertCreated();
    }

    public function test_saving_an_approved_overlapping_period_does_not_require_reconfirmation(): void
    {
        $user = User::factory()->create();
        Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-15',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);

        $created = $this->actingAs($user)
            ->postJson('/api/periods', [
                'start_date' => '2026-11-10',
                'end_date' => '2026-11-20',
                'force' => true,
            ])
            ->assertCreated();

        $periodId = $created->json('data.id');

        // Main period page autosave always sends the existing date range.
        $this->actingAs($user)
            ->putJson("/api/periods/{$periodId}", [
                'start_date' => '2026-11-10',
                'end_date' => '2026-11-20',
                'daily_expenses' => ['2026-11-10' => 1500],
                'unforeseen_allocated' => 1000,
            ])
            ->assertNoContent();

        // Subsequent edits must not ask about the same overlap again.
        $this->actingAs($user)
            ->putJson("/api/periods/{$periodId}", [
                'start_date' => '2026-11-10',
                'end_date' => '2026-11-20',
                'unforeseen_allocated' => 2000,
            ])
            ->assertNoContent();

        $period = Period::findOrFail($periodId);
        $this->assertSame(1500, $period->daily_expenses['2026-11-10']);
        $this->assertSame(2000, $period->unforeseen_allocated);
    }

    public function test_editing_existing_period_dates_does_not_trigger_creation_confirmation(): void
    {
        $user = User::factory()->create();
        $period = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-10',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);
        Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-12-15',
            'end_date' => '2026-12-20',
            'daily_expenses' => [],
            'unforeseen_allocated' => 0,
        ]);

        $this->actingAs($user)
            ->putJson("/api/periods/{$period->id}", [
                'start_date' => '2026-12-16',
                'end_date' => '2026-12-25',
            ])
            ->assertNoContent();

        $this->assertSame('2026-12-16', $period->fresh()->start_date->toDateString());
    }
}
