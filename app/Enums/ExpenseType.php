<?php

namespace App\Enums;

enum ExpenseType: string
{
    case Mandatory = 'mandatory';
    case Unforeseen = 'unforeseen';
    case External = 'external';
    case Income = 'income';
}
