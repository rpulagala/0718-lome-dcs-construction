import { redirect } from "next/navigation";

// The dashboard is the primary request list; /requests is an alias.
export default function RequestsIndex() {
  redirect("/dashboard");
}
