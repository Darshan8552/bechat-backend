<!-- AUTH API's -->

/api/auth
    /api/auth/signup 
    => {name, username, email, password}

    /api/auth/check-username?username=value

    /api/auth/verify-email 
    => {email, otp}

    /api/auth/login 
    => {email or username, password}

    /api/auth/resend-email 
    => {email}
