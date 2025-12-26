import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text mb-4">
        404
      </h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8 text-center">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
}