<!-- AUTH API's -->

/api/auth
    /signup  {name, username, email, password}

    /check-username?username=value

    /verify-email {email, otp}

    /login {email or username, password}
