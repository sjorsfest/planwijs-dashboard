import { type RouteConfig, index, route, layout } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("api/subjects", "routes/api.subjects.tsx"),
  route("api/methods", "routes/api.methods.tsx"),
  route("api/books", "routes/api.books.tsx"),
  route("api/book/:id", "routes/api.book.tsx"),
  route("api/lesplan/:requestId/stream-overview", "routes/api.lesplan.$requestId.stream-overview.ts"),
  route("api/lesplan/:requestId/stream-revision", "routes/api.lesplan.$requestId.stream-revision.ts"),
  layout("routes/app.tsx", [
    route("dashboard", "routes/app.dashboard.tsx"),
    route("calendar", "routes/app.calendar.tsx"),
    route("plans", "routes/app.plans.tsx"),
    route("plans/new", "routes/app.plans.new.tsx"),
    route("lesplan/new", "routes/app.lesplan.new.tsx"),
    route("lesplan/:requestId", "routes/app.lesplan.$requestId.tsx"),
  ]),
] satisfies RouteConfig
