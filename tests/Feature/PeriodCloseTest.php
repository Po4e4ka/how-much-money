<?php

namespace Tests\Feature;

use App\Models\Period;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PeriodCloseTest extends TestCase
{
    use RefreshDatabase;

    public function test_pinned_period_can_be_closed_without_all_daily_expenses(): void
    {
        $user = User::factory()->create();
        $period = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-03',
            'daily_expenses' => [
                '2026-10-01' => 1200,
            ],
            'unforeseen_allocated' => 0,
            'is_pinned' => true,
            'is_closed' => false,
        ]);

        $this->actingAs($user)
            ->postJson("/api/periods/{$period->id}/close")
            ->assertOk()
            ->assertJsonPath('data.is_closed', true)
            ->assertJsonPath('data.is_pinned', false);

        $period->refresh();

        $this->assertTrue($period->is_closed);
        $this->assertFalse($period->is_pinned);
    }

    public function test_unpinned_period_still_requires_all_daily_expenses_to_close(): void
    {
        $user = User::factory()->create();
        $period = Period::create([
            'user_id' => $user->id,
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-03',
            'daily_expenses' => [
                '2026-10-01' => 1200,
            ],
            'unforeseen_allocated' => 0,
            'is_pinned' => false,
            'is_closed' => false,
        ]);

        $this->actingAs($user)
            ->postJson("/api/periods/{$period->id}/close")
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Заполните ежедневные траты за все дни периода.',
            );

        $period->refresh();

        $this->assertFalse($period->is_closed);
        $this->assertFalse($period->is_pinned);
    }
}
