import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`FoodSpin API running on port ${env.port}`);
});
