"use client";

import { useRef, useEffect } from "react";
import { RecaptchaVerifier } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

// RecaptchaVerifier throws "already been rendered in this element" the
// moment a second instance is constructed against the same node before the
// first is cleared -- easy to trigger by calling `new RecaptchaVerifier(...)`
// fresh on every "Send code" / retry. This keeps exactly one instance per
// mounted container, reused across retries and resends, cleared only on
// unmount.
export function useRecaptchaVerifier(containerId: string) {
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  function getVerifier(): RecaptchaVerifier {
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(firebaseAuth, containerId, { size: "invisible" });
    }
    return verifierRef.current;
  }

  return { getVerifier };
}