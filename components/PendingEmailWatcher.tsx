"use client";

import { useEffect } from "react";

const STORAGE_KEY = "outbidind:pending-email-tasks";
const EVENT_NAME = "outbidind:pending-email-scheduled";
const COMPLETED_EVENT_NAME = "outbidind:pending-email-completed";

type PendingEmailTask = {
  listingId: string;
  deadline: number;
};

function readTasks(): PendingEmailTask[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is PendingEmailTask =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PendingEmailTask).listingId === "string" &&
        typeof (item as PendingEmailTask).deadline === "number"
    );
  } catch {
    return [];
  }
}

function writeTasks(tasks: PendingEmailTask[]) {
  try {
    if (tasks.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(tasks)
    );
  } catch {
    // Ignore storage errors.
  }
}

function removeTask(listingId: string) {
  writeTasks(
    readTasks().filter(
      (task) => task.listingId !== listingId
    )
  );
}

export default function PendingEmailWatcher() {
  useEffect(() => {
    const activeRequests = new Set<string>();
    const completedTasks = new Set<string>();

    const checkTask = async (task: PendingEmailTask) => {
      if (
        activeRequests.has(task.listingId) ||
        completedTasks.has(task.listingId)
      ) {
        return;
      }

      if (Date.now() < task.deadline) {
        return;
      }

      activeRequests.add(task.listingId);

      console.log(
        "Pending business email global timer reached 90 seconds:",
        task.listingId
      );

      try {
        const response = await fetch(
          "/api/payments/pending-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              listingId: task.listingId,
            }),
          }
        );

        const data = await response.json();

        console.log(
          "Pending business email global API response:",
          data
        );

        if (!response.ok || !data.success) {
          console.error(
            "Pending business email global check failed:",
            data.error
          );

          return;
        }

        completedTasks.add(task.listingId);
        removeTask(task.listingId);

        console.log(
          "Pending business email global check completed:",
          data
        );
      } catch (error) {
        console.error(
          "Pending business email global request failed:",
          error
        );
      } finally {
        activeRequests.delete(task.listingId);
      }
    };

    const checkAllTasks = () => {
      for (const task of readTasks()) {
        void checkTask(task);
      }
    };

    const handleScheduled = () => {
      console.log(
        "Pending business email global watcher received scheduled event."
      );

      checkAllTasks();
    };

    const handleCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listingId?: string;
      }>;

      const listingId = customEvent.detail?.listingId;

      if (!listingId) {
        return;
      }

      completedTasks.add(listingId);
      removeTask(listingId);

      console.log(
        "Pending business email global task cancelled because payment completed:",
        listingId
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        checkAllTasks();
      }
    };

    window.addEventListener(
      EVENT_NAME,
      handleScheduled
    );

    window.addEventListener(
      COMPLETED_EVENT_NAME,
      handleCompleted
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    /*
     * The watcher is mounted at the root layout level, so it
     * remains alive even if the listing/payment modal is closed.
     *
     * Poll localStorage every second instead of depending only
     * on the payment component remaining mounted.
     */
    const interval = window.setInterval(
      checkAllTasks,
      1_000
    );

    /*
     * Pick up any task that already exists when this watcher
     * mounts or when the page is refreshed.
     */
    checkAllTasks();

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        EVENT_NAME,
        handleScheduled
      );

      window.removeEventListener(
        COMPLETED_EVENT_NAME,
        handleCompleted
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      activeRequests.clear();
      completedTasks.clear();
    };
  }, []);

  return null;
}

export {
  STORAGE_KEY,
  EVENT_NAME,
  COMPLETED_EVENT_NAME,
};
