<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserInfoController extends Controller
{
    public function markShown(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->is_info_shown = true;
            $user->save();
        }

        return response()->json(['ok' => true]);
    }
}
