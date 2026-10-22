function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}

module.exports = errorHandler;
