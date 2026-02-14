<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            CREATE TEMPORARY TABLE expense_dedup_map (
                duplicate_id BIGINT UNSIGNED PRIMARY KEY,
                canonical_id BIGINT UNSIGNED NOT NULL
            ) ENGINE=Memory
        ');

        DB::statement('
            INSERT INTO expense_dedup_map (duplicate_id, canonical_id)
            SELECT e.id AS duplicate_id, g.canonical_id
            FROM expenses e
            JOIN (
                SELECT name, type, MIN(id) AS canonical_id
                FROM expenses
                GROUP BY name, type
            ) g ON g.name = e.name AND g.type = e.type
        ');

        DB::statement('
            INSERT INTO period_expense (period_id, expense_id, planned_amount, actual_amount, created_at, updated_at)
            SELECT
                pe.period_id,
                m.canonical_id AS expense_id,
                SUM(pe.planned_amount) AS planned_amount,
                SUM(pe.actual_amount) AS actual_amount,
                MIN(pe.created_at) AS created_at,
                MAX(pe.updated_at) AS updated_at
            FROM period_expense pe
            JOIN expense_dedup_map m ON m.duplicate_id = pe.expense_id
            GROUP BY pe.period_id, m.canonical_id
            ON DUPLICATE KEY UPDATE
                planned_amount = VALUES(planned_amount),
                actual_amount = VALUES(actual_amount),
                updated_at = GREATEST(period_expense.updated_at, VALUES(updated_at))
        ');

        DB::statement('
            DELETE pe
            FROM period_expense pe
            JOIN expense_dedup_map m ON m.duplicate_id = pe.expense_id
            WHERE m.duplicate_id <> m.canonical_id
        ');

        DB::statement('
            DELETE e
            FROM expenses e
            JOIN expense_dedup_map m ON m.duplicate_id = e.id
            WHERE m.duplicate_id <> m.canonical_id
        ');

        DB::statement('DROP TEMPORARY TABLE expense_dedup_map');

        Schema::table('expenses', function (Blueprint $table) {
            $table->unique(['name', 'type']);
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropUnique('expenses_name_type_unique');
        });
    }
};
