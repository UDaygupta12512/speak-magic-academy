import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import ErrorLayout from "@/components/ErrorLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 - Route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <ErrorLayout
      code="404"
      emoji="🔍"
      title="Page not found"
      message="Oops! Genie searched everywhere but couldn't find this page. Let's get you back to learning."
      primaryAction={{ label: "Back to Home", to: "/" }}
      secondaryAction={{ label: "Explore Lessons", to: "/learn" }}
      accent="yellow"
    />
  );
};

export default NotFound;
