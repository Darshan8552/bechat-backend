export const requestLogger = (req, res, next) => {
    const start = Date.now()


    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`)

    res.on("finish", () => {
        const duration = Date.now() - start
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`)
    })

    next()
}
