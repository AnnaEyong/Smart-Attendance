class BaseService {
  constructor(model) {
    if (!model) {
      throw new Error("Model is Required");
    }

    this.model = model;
  }

  async create(data) {
    try {
      const result = await this.model.create(data);
      return {
        error: false,
        data: result,
        message: "Item Created Successfully",
      };
    } catch (error) {
      return {
        error: true,
        message: error.message || "Internal Server Error, Please try again later.",
      };
    }
  }

  async find(filter) {
    try {
      const result = await this.model.find(filter || {});
      return {
        error: false,
        data: result,
        message: "Item Fetched Successfully",
      };
    } catch (error) {
      return {
        error: true,
        message: error.message || "Internal Server Error, Please try again later.",
      };
    }
  }

  async findBy(filter) {
    try {
      const isString = typeof filter === "string";
      const result = isString
        ? await this.model.findById(filter)
        : await this.model.find(filter || {});

      return {
        error: false,
        data: result,
      };
    } catch (error) {
      return {
        error: true,
        message: error.message || "Error, Please try again later.",
      };
    }
  }

  async update(id, data) {
    try {
      if (!id || !data) {
        return {
          error: true,
          message: "Please Send Id and Data",
        };
      }

      const result = await this.model.findByIdAndUpdate(id, data);
      return {
        error: false,
        data: result,
        message: "Data Updated Successfully",
      };
    } catch (error) {
      return {
        error: true,
        message: error.message || "Internal Server Error, Please try again later.",
      };
    }
  }

  async remove(id) {
    try {
      if (!id) {
        return {
          error: true,
          message: "Please Send Id",
        };
      }

      const result = await this.model.findByIdAndDelete(id);
      return {
        error: false,
        data: result,
        message: "Data Deleted Successfully",
      };
    } catch (error) {
      return {
        error: true,
        message: error.message || "Internal Server Error, Please try again later.",
      };
    }
  }
}

module.exports = BaseService;
