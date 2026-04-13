import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ListTodo,
  Users,
  FileText,
} from "lucide-react"

export const navItems = [
  {
    to: "/dashboard",
    label: "Overzicht",
    icon: LayoutDashboard,
  },
  {
    to: "/classes",
    label: "Klassen",
    icon: Users,
  },
  {
    to: "/plans",
    label: "Lessen",
    icon: BookOpen,
  },
  {
    to: "/documents",
    label: "Documenten",
    icon: FileText,
  },
  {
    to: "/todos",
    label: "To Do's",
    icon: ListTodo,
  },
  {
    to: "/calendar",
    label: "Kalender",
    icon: CalendarDays,
  },
]
