"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

  return (
      <div className="flex flex-col grow items-center justify-center text-sm h-100">
          <p className="font-medium text-lg text-indigo-600">404 Error</p>
          <h2 className="md:text-6xl text-4xl font-semibold text-gray-800">Page Not Found</h2>
          <p className="text-sm lg:text-base mt-4 text-gray-500">{`Sorry, we couldn't find the page you're looking for.`}</p>
          <div className="flex items-center gap-4 mt-6">
              <button type="button" className="bg-indigo-600 hover:bg-indigo-500 px-7 py-2.5 cursor-pointer text-white rounded active:scale-95 transition-all" onClick={() => router.push("/")}>
                  Go back home
              </button>
          </div>
      </div>
  )
}