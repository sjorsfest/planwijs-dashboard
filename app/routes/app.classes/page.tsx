import { useState } from "react"
import { useLoaderData } from "react-router"
import { Users, MapPin } from "lucide-react"
import { motion, LayoutGroup } from "framer-motion"
import { cn } from "~/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs"
import type { loader } from "./route"
import { SUBTLE_LAYOUT_TRANSITION } from "./constants"
import { EmptyClassesState } from "~/components/classes/EmptyClassesState"
import { EmptyClassroomsState } from "~/components/classes/EmptyClassroomsState"
import { CreateClassCard } from "~/components/classes/CreateClassCard"
import { CreateClassroomCard } from "~/components/classes/CreateClassroomCard"
import { ClassCard } from "~/components/classes/ClassCard"
import { ClassroomCard } from "~/components/classes/ClassroomCard"

export default function ClassesPage() {
  const { classes, classrooms, schoolLevels } = useLoaderData<typeof loader>()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const selectedId = editingId
  const orderedClasses = selectedId
    ? [
        ...classes.filter((cls) => cls.id === selectedId),
        ...classes.filter((cls) => cls.id !== selectedId),
      ]
    : classes
  const focusedClass = editingId ? orderedClasses.find((cls) => cls.id === editingId) ?? null : null
  const classesToRender = focusedClass ? [focusedClass] : orderedClasses
  const isFocusedEditView = focusedClass !== null

  function closeEditor() {
    setEditingId(null)
  }

  function startEditor(classId: string) {
    setEditingId(classId)
  }

  const [creatingClass, setCreatingClass] = useState(false)

  // Classroom editing state
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null)
  const [deletingClassroomId, setDeletingClassroomId] = useState<string | null>(null)
  const orderedClassrooms = editingClassroomId
    ? [
        ...classrooms.filter((cr) => cr.id === editingClassroomId),
        ...classrooms.filter((cr) => cr.id !== editingClassroomId),
      ]
    : classrooms
  const focusedClassroom = editingClassroomId
    ? orderedClassrooms.find((cr) => cr.id === editingClassroomId) ?? null
    : null
  const classroomsToRender = focusedClassroom ? [focusedClassroom] : orderedClassrooms
  const isFocusedClassroomEditView = focusedClassroom !== null

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] tracking-tight">
          Klassenoverzicht
        </h1>
        <p className="text-sm text-[#464554] mt-1.5">
          Beheer je klassen, lokalen en hun profielen. Deze gegevens bepalen hoe de AI je lesplannen op maat maakt.
        </p>
      </div>

      <Tabs defaultValue="klassen">
        <TabsList>
          <TabsTrigger value="klassen" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Klassen
          </TabsTrigger>
          <TabsTrigger value="lokalen" className="gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Lokalen
          </TabsTrigger>
        </TabsList>

        {/* Klassen tab */}
        <TabsContent value="klassen">
          {classes.length === 0 ? (
            <EmptyClassesState availableLevels={schoolLevels} />
          ) : (
            <LayoutGroup>
              <motion.div
                layout
                transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                className={cn(
                  "grid gap-4",
                  isFocusedEditView
                    ? "grid-cols-1 max-w-3xl"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                )}
              >
                {classesToRender.map((cls) => (
                  <motion.div
                    key={cls.id}
                    layout
                    transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                    className={cn(
                      isFocusedEditView && editingId === cls.id && "col-start-1 row-start-1"
                    )}
                  >
                    <ClassCard
                      cls={cls}
                      availableLevels={schoolLevels}
                      isEditing={editingId === cls.id}
                      isDeleting={deletingId === cls.id}
                      onEdit={() => {
                        if (editingId === cls.id) {
                          closeEditor()
                        } else {
                          startEditor(cls.id!)
                        }
                      }}
                      onCancelEdit={closeEditor}
                      onDelete={() => setDeletingId(cls.id!)}
                      onCancelDelete={() => setDeletingId(null)}
                      onSaved={closeEditor}
                    />
                  </motion.div>
                ))}
                {!isFocusedEditView && (
                  <CreateClassCard
                    availableLevels={schoolLevels}
                    isCreating={creatingClass}
                    onToggle={() => setCreatingClass(!creatingClass)}
                    onCreated={() => setCreatingClass(false)}
                  />
                )}
              </motion.div>
            </LayoutGroup>
          )}
        </TabsContent>

        {/* Lokalen tab */}
        <TabsContent value="lokalen">
          {classrooms.length === 0 ? (
            <EmptyClassroomsState />
          ) : (
            <LayoutGroup id="classrooms">
              <motion.div
                layout
                transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                className={cn(
                  "grid gap-4",
                  isFocusedClassroomEditView
                    ? "grid-cols-1 max-w-3xl"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                )}
              >
                {classroomsToRender.map((classroom) => (
                  <motion.div
                    key={classroom.id}
                    layout
                    transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                    className={cn(
                      isFocusedClassroomEditView && editingClassroomId === classroom.id && "col-start-1 row-start-1"
                    )}
                  >
                    <ClassroomCard
                      classroom={classroom}
                      isEditing={editingClassroomId === classroom.id}
                      isDeleting={deletingClassroomId === classroom.id}
                      onEdit={() => {
                        if (editingClassroomId === classroom.id) {
                          setEditingClassroomId(null)
                        } else {
                          setEditingClassroomId(classroom.id!)
                        }
                      }}
                      onCancelEdit={() => setEditingClassroomId(null)}
                      onDelete={() => setDeletingClassroomId(classroom.id!)}
                      onCancelDelete={() => setDeletingClassroomId(null)}
                      onSaved={() => setEditingClassroomId(null)}
                    />
                  </motion.div>
                ))}
                {!isFocusedClassroomEditView && (
                  <CreateClassroomCard
                    isCreating={creatingClassroom}
                    onToggle={() => setCreatingClassroom(!creatingClassroom)}
                    onCreated={() => setCreatingClassroom(false)}
                  />
                )}
              </motion.div>
            </LayoutGroup>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
