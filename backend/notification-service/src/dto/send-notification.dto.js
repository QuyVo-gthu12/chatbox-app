// Dùng Joi để validate dữ liệu gửi notification
const Joi = require('joi');

const sendNotificationSchema = Joi.object({
  userId: Joi.string().required(),    // device token hoặc user id
  title: Joi.string().required(),
  body: Joi.string().required(),
  data: Joi.object().optional()
});

module.exports = sendNotificationSchema;
