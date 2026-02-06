export const asyncHandler = (fn) => {
  return (req, res, next) => {
    // If the function throws an error, pass it to next() -> errorHandler
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};
