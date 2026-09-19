import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  LockKeyhole,
  Plus,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputClass =
  "h-10 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";
const scheduleTagStyles = [
  {
    row: "border-[#b8dfd0] bg-[#f1fbf5]",
    tag: "bg-[#d8f1e3] text-[#145c45]",
    dot: "bg-[#258765]",
  },
  {
    row: "border-[#c8d8ef] bg-[#f3f7fd]",
    tag: "bg-[#dfeafb] text-[#24528a]",
    dot: "bg-[#4b78bd]",
  },
  {
    row: "border-[#ead4a5] bg-[#fffaf0]",
    tag: "bg-[#f8e9bd] text-[#755619]",
    dot: "bg-[#b27b1f]",
  },
  {
    row: "border-[#e6c7d9] bg-[#fff5fa]",
    tag: "bg-[#f5dbe9] text-[#7d315b]",
    dot: "bg-[#ae4e7f]",
  },
];
const standardClassPresets = [
  {
    group: "Basic",
    options: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"],
    level: "Basic",
  },
  {
    group: "Junior Secondary",
    options: ["JSS 1", "JSS 2", "JSS 3"],
    level: "Junior secondary",
  },
  {
    group: "Senior Secondary",
    options: ["SS 1", "SS 2", "SS 3"],
    level: "Senior secondary",
  },
];

export function AcademicClassSetup({
  schoolId,
  academic,
  staff,
  canConfigure,
  onRegister,
  onDone,
}: {
  schoolId: number;
  academic: any;
  staff: any[];
  canConfigure: boolean;
  onRegister: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<{
    classItem: any;
    entry: any;
  } | null>(null);
  const createClass = trpc.nsos.academics.createClass.useMutation({
    onSuccess: () => {
      toast.success("Class created and added to school class choices.");
      setName("");
      setLevel("");
      setSessionId("");
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  const classes = academic?.classes ?? [];
  const sessions = academic?.sessions ?? [];
  const staffNames = new Map<number, string>(
    staff.map(item => [
      Number(item.id),
      `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim(),
    ])
  );
  const subjects = new Map<number, string>(
    (academic?.subjects ?? []).map((item: any) => [
      Number(item.id),
      String(item.name),
    ])
  );
  const scheduleByClass = new Map<number, any[]>();
  (academic?.timetable ?? []).forEach((entry: any) => {
    const classId = Number(entry.classId);
    scheduleByClass.set(classId, [
      ...(scheduleByClass.get(classId) ?? []),
      entry,
    ]);
  });
  const dayLabels: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };
  const formatTime = (value: string | undefined) => {
    if (!value) return "—";
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
    const suffix = hours >= 12 ? "pm" : "am";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, "0")}${suffix}`;
  };
  const scheduleStyleFor = (entry: any) => {
    const label = `${subjects.get(Number(entry.subjectId)) ?? "Subject"}|${entry.room ?? ""}`;
    const hash = Array.from(label).reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    );
    return scheduleTagStyles[hash % scheduleTagStyles.length];
  };
  const classDescriptionFor = (item: any) =>
    [
      item.level || "General school class",
      item.arm ? `Arm ${item.arm}` : null,
      item.capacity ? `Capacity ${item.capacity}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const selectedClass = selectedSchedule?.classItem;
  const selectedEntry = selectedSchedule?.entry;
  const selectedSubject = selectedEntry
    ? (subjects.get(Number(selectedEntry.subjectId)) ?? "Subject")
    : "";
  const selectedInstructor = selectedEntry
    ? staffNames.get(Number(selectedEntry.teacherId)) || "Not assigned"
    : "";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createClass.mutate({
      schoolId,
      name: name.trim(),
      level: level.trim() || undefined,
      sessionId: sessionId ? Number(sessionId) : undefined,
    });
  };

  return (
    <>
      <section
        id="school-classes"
        className="overflow-hidden rounded-[1.2rem] border border-[#cbded0] bg-white shadow-[0_10px_28px_rgba(23,79,55,.05)]"
      >
        <div className="flex flex-col gap-3 border-b border-[#e2ebe3] bg-[linear-gradient(135deg,#f3fbf5_0%,#fffdfa_70%)] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-[#244333]">Classes</p>
                <span className="rounded-full bg-[#e2f1e8] px-2.5 py-1 text-[10px] font-bold text-[#176145]">
                  {classes.length} configured
                </span>
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[#18372b]">
                Put every class choice in one visible place.
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#5d7568]">
                Create the school classes first. They then appear in student
                assignment, curriculum templates, subjects, timetables, lesson
                plans, fees, results, and approved academic imports.
              </p>
            </div>
          </div>
          <a
            href="#school-classes"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b7d2be] bg-white px-3 text-xs font-bold text-[#176145] hover:bg-[#f5fbf6]"
          >
            <Plus className="h-3.5 w-3.5" />
            {canConfigure ? "Add class below" : "View classes"}
          </a>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#304c3d]">
                  Available class choices
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#667b70]">
                  These are the choices staff will see in downstream academic
                  forms.
                </p>
              </div>
              <span className="rounded-full bg-[#f0f5f1] px-2.5 py-1 text-[10px] font-bold text-[#557064]">
                Tenant-scoped
              </span>
            </div>
            {classes.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {classes.map((item: any) => {
                  const schedule = scheduleByClass.get(Number(item.id)) ?? [];
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#dce8df] bg-[#fbfdfb] p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#e2f1e8] text-[#176145]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#29483a]">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[10px] text-[#6b7d73]">
                            {item.level || "Class"}
                            {item.sessionId
                              ? ` · ${sessions.find((session: any) => Number(session.id) === Number(item.sessionId))?.name ?? "Academic session"}`
                              : " · No session selected"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 border-t border-[#e7eee8] pt-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#557064]">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Schedule preview
                        </div>
                        {schedule.length ? (
                          <div className="mt-2 grid gap-1.5">
                            {schedule.slice(0, 2).map((entry: any) => {
                              const style = scheduleStyleFor(entry);
                              const subject =
                                subjects.get(Number(entry.subjectId)) ??
                                "Subject";
                              return (
                                <button
                                  type="button"
                                  key={entry.id}
                                  onClick={() =>
                                    setSelectedSchedule({
                                      classItem: item,
                                      entry,
                                    })
                                  }
                                  tabIndex={0}
                                  aria-label={`Open ${subject} schedule details for ${item.name}`}
                                  aria-describedby={`schedule-tooltip-${entry.id}`}
                                  className={`group relative flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] leading-4 text-[#536a5e] outline-none transition focus:ring-2 focus:ring-[#0f5c4f]/25 ${style.row}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                                    aria-hidden="true"
                                  />
                                  <span className="font-bold">
                                    {dayLabels[entry.dayOfWeek] ??
                                      entry.dayOfWeek}
                                  </span>{" "}
                                  {formatTime(entry.startsAt)}–
                                  {formatTime(entry.endsAt)}
                                  <span
                                    className={`rounded px-1.5 py-0.5 font-bold ${style.tag}`}
                                  >
                                    {subject}
                                  </span>
                                  {entry.room && (
                                    <span className="text-[#536a5e]">
                                      Room {entry.room}
                                    </span>
                                  )}
                                  <span
                                    id={`schedule-tooltip-${entry.id}`}
                                    role="tooltip"
                                    className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-64 translate-y-1 rounded-lg border border-[#245b49] bg-[#123b31] p-3 text-left text-[10px] leading-4 text-white opacity-0 shadow-lg transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                                  >
                                    <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[#b9e4c2]">
                                      Instructor
                                    </span>
                                    <span className="block font-semibold text-white">
                                      {staffNames.get(
                                        Number(entry.teacherId)
                                      ) || "Not assigned"}
                                    </span>
                                    <span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#b9e4c2]">
                                      Class description
                                    </span>
                                    <span className="block text-white/85">
                                      {classDescriptionFor(item)}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                            {schedule.length > 2 && (
                              <p className="text-[10px] font-semibold text-[#176145]">
                                {schedule.length - 2 === 1
                                  ? "+1 more timetable entry"
                                  : `+${schedule.length - 2} more timetable entries`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-[10px] leading-4 text-[#7a887f]">
                            No timetable entries yet. Add a schedule when this
                            class is ready for teaching.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-[#d4e2d6] bg-[#fbfdfb] p-4 text-xs leading-5 text-[#687b71]">
                <p className="font-bold text-[#3e5d4d]">
                  No classes configured yet.
                </p>
                <p className="mt-1">
                  Add the first class on this page. Until a class exists, class
                  selectors elsewhere will correctly show no available choice.
                </p>
              </div>
            )}
          </div>

          {canConfigure ? (
            <form
              onSubmit={submit}
              className="rounded-xl border border-[#dce8df] bg-[#f8fcf8] p-4"
            >
              <p className="text-xs font-bold text-[#304c3d]">
                Add a school class
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#667b70]">
                Use the school’s approved name, such as Primary 1, JSS 1, or SS
                2 Science.
              </p>
              <div className="mt-4 rounded-xl border border-[#dce8df] bg-white p-3">
                <p className="text-[11px] font-bold text-[#304c3d]">
                  Standard Nigerian class presets
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#718279]">
                  Select a preset to fill the form. Nothing is created until you
                  press Create class.
                </p>
                <div className="mt-3 grid gap-3">
                  {standardClassPresets.map(preset => (
                    <div key={preset.group}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#718279]">
                        {preset.group}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {preset.options.map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setName(option);
                              setLevel(preset.level);
                            }}
                            className="rounded-lg border border-[#cfe0d2] bg-[#f7fbf7] px-2.5 py-1.5 text-[10px] font-bold text-[#176145] hover:bg-[#eaf5ec]"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <label className="grid gap-1.5 text-[11px] font-bold text-[#43554b] sm:col-span-2 lg:col-span-1 xl:col-span-1">
                  <span>Class name</span>
                  <input
                    required
                    value={name}
                    onChange={event => setName(event.target.value)}
                    className={inputClass}
                    placeholder="e.g. JSS 1"
                    maxLength={120}
                  />
                </label>
                <label className="grid gap-1.5 text-[11px] font-bold text-[#43554b]">
                  <span>Level (optional)</span>
                  <input
                    value={level}
                    onChange={event => setLevel(event.target.value)}
                    className={inputClass}
                    placeholder="e.g. Junior secondary"
                    maxLength={80}
                  />
                </label>
                <label className="grid gap-1.5 text-[11px] font-bold text-[#43554b] sm:col-span-3 lg:col-span-1 xl:col-span-1">
                  <span>Academic session (optional)</span>
                  <select
                    value={sessionId}
                    onChange={event => setSessionId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">No session selected</option>
                    {sessions.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!sessions.length && (
                <p className="mt-3 rounded-lg border border-[#ead9a6] bg-[#fffaf0] p-3 text-[11px] leading-5 text-[#745b2b]">
                  You can add a session later. The class will still be available
                  now; link it to a session when the academic calendar is ready.
                </p>
              )}
              <button
                type="submit"
                disabled={createClass.isPending || !name.trim()}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0f5c4f] px-3.5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {createClass.isPending ? "Creating class…" : "Create class"}
              </button>
            </form>
          ) : (
            <div className="flex gap-3 rounded-xl border border-[#e6dfc9] bg-[#fffaf0] p-4 text-xs leading-5 text-[#725b2d]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Only the school owner or an administrator can create classes.
                Staff can use the approved class choices once they are
                configured.
              </p>
            </div>
          )}
        </div>
      </section>
      <Dialog
        open={Boolean(selectedSchedule)}
        onOpenChange={open => {
          if (!open) setSelectedSchedule(null);
        }}
      >
        <DialogContent className="border-[#d7e5da] bg-[#fbfdfb] sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-[#203c31]">
              Schedule details
            </DialogTitle>
            <DialogDescription className="leading-5 text-[#64766b]">
              Review the full class and timetable information before opening the
              protected registration workspace.
            </DialogDescription>
          </DialogHeader>
          {selectedClass && selectedEntry && (
            <div className="grid gap-3">
              <div className="rounded-xl border border-[#cfe2d4] bg-[#f1fbf5] p-4">
                <p className="text-sm font-bold text-[#244333]">
                  {selectedClass.name}
                </p>
                <p className="mt-1 text-xs text-[#587165]">
                  {classDescriptionFor(selectedClass)}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Detail label="Subject" value={selectedSubject} />
                <Detail label="Instructor" value={selectedInstructor} />
                <Detail
                  label="Day and time"
                  value={`${dayLabels[selectedEntry.dayOfWeek] ?? selectedEntry.dayOfWeek} · ${formatTime(selectedEntry.startsAt)}–${formatTime(selectedEntry.endsAt)}`}
                />
                <Detail
                  label="Room"
                  value={selectedEntry.room || "Not assigned"}
                />
                <Detail
                  label="Academic session"
                  value={
                    sessions.find(
                      (session: any) =>
                        Number(session.id) === Number(selectedClass.sessionId)
                    )?.name ?? "No session selected"
                  }
                />
                <Detail
                  label="Class status"
                  value={selectedClass.status ?? "active"}
                />
              </div>
              <p className="rounded-xl border border-[#ead9a6] bg-[#fffaf0] p-3 text-[11px] leading-5 text-[#745b2b]">
                Registration opens Admissions for review. It does not enroll a
                learner, charge a fee, or send a message automatically.
              </p>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSelectedSchedule(null)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2.5 text-xs font-bold text-[#64766b] hover:bg-[#eef4ef]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSchedule(null);
                onRegister();
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0f5c4f] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0b4d42]"
            >
              <UserRound className="h-4 w-4" />
              Register a learner
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e0e9e1] bg-white p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#718279]">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#304b3d]">{value}</p>
    </div>
  );
}

export default AcademicClassSetup;
