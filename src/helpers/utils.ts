const bcrypt = require('bcrypt');
const saltRounds = 10;

export const hashPasswordHelper = async (password: string) => {
  try {
    return bcrypt.hash(password, saltRounds);
  } catch (err) {
    console.error('Error hashing password:', err);
  }
};

export const comparePasswordHelper = async (
  plainPassword: string,
  hashedPassword: string,
) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (err) {
    console.error('Error comparing password:', err);
    return false;
  }
};
