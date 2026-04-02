import { WorkspaceFrame } from "../../components/chrome/workspace-frame";

export default function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
