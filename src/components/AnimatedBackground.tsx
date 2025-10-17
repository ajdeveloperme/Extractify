import { FileText, CreditCard, Shield, Lock, User, Scan, CheckCircle2, File } from "lucide-react";

const AnimatedBackground = () => {
  const icons = [
    { Icon: FileText, color: "text-blue-400", position: "top-[10%] left-[8%]", delay: "0s", duration: "10s" },
    { Icon: CreditCard, color: "text-green-400", position: "top-[25%] left-[15%]", delay: "2s", duration: "15s" },
    { Icon: Shield, color: "text-purple-400", position: "top-[45%] left-[5%]", delay: "4s", duration: "12s" },
    { Icon: Lock, color: "text-pink-400", position: "bottom-[15%] left-[12%]", delay: "1s", duration: "14s" },
    { Icon: User, color: "text-orange-400", position: "top-[35%] left-[85%]", delay: "3s", duration: "13s" },
    { Icon: Scan, color: "text-emerald-400", position: "top-[60%] left-[80%]", delay: "5s", duration: "11s" },
    { Icon: CheckCircle2, color: "text-indigo-400", position: "bottom-[25%] left-[88%]", delay: "2.5s", duration: "16s" },
    { Icon: File, color: "text-amber-400", position: "top-[15%] left-[92%]", delay: "1.5s", duration: "10s" },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, index) => (
        <div
          key={index}
          className={`absolute ${item.position} animate-float-icon opacity-40`}
          style={{
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          <div className={`${item.color} bg-current/10 rounded-full p-6 backdrop-blur-sm`}>
            <item.Icon className={`w-8 h-8 ${item.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnimatedBackground;
