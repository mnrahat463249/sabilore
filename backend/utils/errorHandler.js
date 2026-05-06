


const serverError = (res, err, label = '', clientMsg = null) => {
    const tag = label ? `[${label}]` : '[Server]';
    console.error(`${tag} Error:`, err?.message || err);
    res.status(500).json({
        message: clientMsg || 'An internal server error occurred. Please try again.'
    });
};


const badRequest = (res, message = 'Bad request.') => {
    res.status(400).json({ message });
};


const notFound = (res, message = 'Resource not found.') => {
    res.status(404).json({ message });
};

module.exports = { serverError, badRequest, notFound };
