<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('periods', function (Blueprint $table) {
            $table->dropColumn('income_amount');
        });
    }

    public function down(): void
    {
        Schema::table('periods', function (Blueprint $table) {
            $table->unsignedBigInteger('income_amount')->default(0);
        });
    }
};
