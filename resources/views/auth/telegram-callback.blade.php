<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Telegram Sign In</title>
</head>
<body>
<script>
    (function () {
        const hashValue = window.location.hash.startsWith('#')
            ? window.location.hash.substring(1)
            : '';

        const hashParams = new URLSearchParams(hashValue);
        const queryParams = new URLSearchParams(window.location.search);
        const payload = new URLSearchParams();

        for (const [key, value] of hashParams.entries()) {
            payload.set(key, value);
        }

        for (const [key, value] of queryParams.entries()) {
            if (!payload.has(key)) {
                payload.set(key, value);
            }
        }

        if (!payload.has('hash')) {
            window.location.replace(@json(route('home')));
            return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = @json($postUrl);
        form.style.display = 'none';

        const csrf = document.createElement('input');
        csrf.type = 'hidden';
        csrf.name = '_token';
        csrf.value = @json(csrf_token());
        form.appendChild(csrf);

        for (const [key, value] of payload.entries()) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
    })();
</script>
</body>
</html>
