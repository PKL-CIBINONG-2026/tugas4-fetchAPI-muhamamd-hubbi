import { UserApi } from "./UserApi.js";
import { UserView } from "./UserView.js";
import { UserController } from "./UserController.js";

const api = new UserApi();
const view = new UserView();
const controller = new UserController(api, view);

controller.start();


