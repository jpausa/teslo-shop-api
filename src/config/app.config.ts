export const EnvConfig = () => {
  return {
    database: {
      name: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      debPort: +process.env.DB_PORT || 5432,
    },
    port: +process.env.PORT || 3000,
  };
};
