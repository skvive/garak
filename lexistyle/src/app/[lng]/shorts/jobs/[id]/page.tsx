import { JobView } from "./job-view";

export const metadata = { title: "영상 만들기 진행 상황" };

export default async function ShortJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobView id={id} />;
}
