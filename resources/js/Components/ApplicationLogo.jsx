export default function ApplicationLogo(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            aria-hidden="true"
        >
            <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" opacity="0.18" />
            <path
                d="M9 21v-9l7-4 7 4v9l-7 4-7-4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="m9 12 7 4 7-4M16 16v9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}
