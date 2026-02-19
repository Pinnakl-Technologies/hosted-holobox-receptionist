import { User, RefreshCw } from "react-feather";

export default function AvatarSwitcher({ selectedAvatar, onSwitch }) {
    return (
        <button
            onClick={onSwitch}
            className="glass-button rounded-full p-4 flex items-center justify-center animate-float-delayed text-white transition-all duration-200"
            aria-label={selectedAvatar === "avatar1" ? "Switch to Boy" : "Switch to Girl"}
        >
            <div className="relative">
                <User size={24} />
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                    <RefreshCw size={10} />
                </div>
            </div>
        </button>
    );
}
