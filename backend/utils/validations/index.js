const { z } = require("zod");

const Validation = (schema, data) => {
  try {
    const valid_data = schema.parse(data);
    return {
      isValid: true,
      data: valid_data,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors || [];
      return {
        isValid: false,
        error: {
          path: errors.map((err) => ({
            field: Array.isArray(err.path) ? err.path[0] : "unknown",
            message: err.message,
          })),
          message: "Error in your form, please verify !!!",
        },
      };
    }

    return {
      isValid: false,
      error: {
        path: [],
        message: "Invalid data",
      },
    };
  }
};

module.exports = Validation;
