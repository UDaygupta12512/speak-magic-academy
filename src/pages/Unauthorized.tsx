import ErrorLayout from "@/components/ErrorLayout";

const Unauthorized = () => (
  <ErrorLayout
    code="401"
    emoji="🔒"
    title="Please sign in first"
    message="You need to be signed in to visit this page. Head back home to keep learning with Genie."
    primaryAction={{ label: "Back to Home", to: "/" }}
    accent="primary"
  />
);

export default Unauthorized;
