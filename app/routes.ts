import { type RouteConfig, index, route, layout } from "@react-router/dev/routes"

export default [
  index("routes/home/route.tsx"),
  route("login", "routes/login/route.tsx"),
  route("auth/callback", "routes/auth.callback/route.tsx"),
  route("auth/logout", "routes/auth.logout/route.tsx"),
  route("api/subjects", "routes/api.subjects/route.tsx"),
  route("api/methods", "routes/api.methods/route.tsx"),
  route("api/books", "routes/api.books/route.tsx"),
  route("api/book/:id", "routes/api.book/route.tsx"),
  route("api/classrooms", "routes/api.classrooms/route.tsx"),
  route("api/tasks/:taskId", "routes/api.tasks.$taskId/route.ts"),
  layout("routes/app/route.tsx", [
    route("dashboard", "routes/app.dashboard/route.tsx"),
    route("todos", "routes/app.todo/route.tsx"),
    route("calendar", "routes/app.calendar/route.tsx"),
    route("plans", "routes/app.plans/route.tsx"),
    route("classes", "routes/app.classes/route.tsx"),
    route("plans/new", "routes/app.plans.new/route.tsx"),
    route("lesplan/new", "routes/app.lesplan.new/route.tsx"),
    route("lesplan/:requestId", "routes/app.lesplan.$requestId/route.tsx"),
    route("lesplan/:requestId/les/:lessonId", "routes/app.lesplan.$requestId.les.$lessonId/route.tsx"),
  ]),
] satisfies RouteConfig
