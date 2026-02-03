<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('period_expense', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('planned_amount')->default(0);
            $table->unsignedBigInteger('actual_amount')->default(0);
            $table->timestamps();

            $table->unique(['period_id', 'expense_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_expense');
    }
};
