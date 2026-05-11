import { VendorDetailView } from "@/components/VendorDetailView";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VendorDetailView id={id} />;
}
