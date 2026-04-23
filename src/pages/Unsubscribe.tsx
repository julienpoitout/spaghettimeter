import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status =
  | "validating"
  | "ready"
  | "already_unsubscribed"
  | "invalid"
  | "submitting"
  | "success"
  | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("validating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setStatus("invalid");
        return;
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
          return;
        }
        if (data.valid === true) {
          setStatus("ready");
          return;
        }
        setStatus("invalid");
      } catch (e) {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        { body: { token } },
      );
      if (invokeError) throw invokeError;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
        setError("Unable to process your unsubscribe right now.");
      }
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-4">
        <div className="text-5xl">🍝</div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Unsubscribe from SpaghettiMeter emails
        </h1>

        {status === "validating" && (
          <p className="text-muted-foreground font-body">Checking your link…</p>
        )}

        {status === "ready" && (
          <>
            <p className="text-muted-foreground font-body">
              Click below to stop receiving emails from SpaghettiMeter.
            </p>
            <Button onClick={handleConfirm} variant="spaghettify" className="w-full">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {status === "submitting" && (
          <p className="text-muted-foreground font-body">Updating your preferences…</p>
        )}

        {status === "success" && (
          <p className="text-foreground font-body">
            You're unsubscribed. Sorry to see you go! 🍝
          </p>
        )}

        {status === "already_unsubscribed" && (
          <p className="text-foreground font-body">
            You've already been unsubscribed. No further action needed.
          </p>
        )}

        {status === "invalid" && (
          <p className="text-destructive font-body">
            This unsubscribe link is invalid or has expired.
          </p>
        )}

        {status === "error" && (
          <p className="text-destructive font-body">
            {error ?? "Something went wrong. Please try again later."}
          </p>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;