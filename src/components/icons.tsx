import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22v-5" />
      <path d="M20 22v-5" />
      <path d="M4 22v-5" />
      <path d="M15.13 2.69a2 2 0 0 0-2.26 0l-4 2.05a2 2 0 0 0-1.13 1.76V17a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6.5a2 2 0 0 0-1.13-1.76l-4-2.05Z" />
      <path d="M8 19h8" />
    </svg>
  );
}
