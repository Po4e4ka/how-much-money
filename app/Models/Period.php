<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Period extends Model
{
    protected $fillable = [
        'user_id',
        'start_date',
        'end_date',
        'daily_expenses',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'daily_expenses' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function expenses(): BelongsToMany
    {
        return $this->belongsToMany(Expense::class, 'period_expense')
            ->withPivot(['planned_amount', 'actual_amount'])
            ->withTimestamps();
    }
}
