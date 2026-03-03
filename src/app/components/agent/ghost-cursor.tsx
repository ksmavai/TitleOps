import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MousePointer2 } from "lucide-react";

interface GhostCursorProps {
    targets: {
        priority: React.RefObject<HTMLElement>;
        priorityOption?: React.RefObject<HTMLElement>;
        component: React.RefObject<HTMLElement>;
        componentOption?: React.RefObject<HTMLElement>;
        title: React.RefObject<HTMLInputElement>;
        description: React.RefObject<HTMLTextAreaElement>;
        submit: React.RefObject<HTMLButtonElement>;
    };
    data: {
        priority: string;
        component: string;
        title: string;
        description: string;
    } | null;
    onFormUpdate: (field: string, value: string) => void;
    onComplete: () => void;
}

export function GhostCursor({ targets, data, onFormUpdate, onComplete }: GhostCursorProps) {
    const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [clicking, setClicking] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const moveMouseTo = async (ref: React.RefObject<HTMLElement>): Promise<boolean> => {
            if (!isMounted || !ref.current) return false;
            const rect = ref.current.getBoundingClientRect();
            // Move to exactly the dead-center of the element to avoid missing dropdowns
            setPos({
                x: rect.left + (rect.width / 2),
                y: rect.top + (rect.height / 2)
            });
            await new Promise(r => setTimeout(r, 800)); // Wait for framer-motion 0.8s transition
            return true;
        };

        const click = async (ref: React.RefObject<HTMLElement>): Promise<boolean> => {
            if (!isMounted || !ref.current) return false;
            setClicking(true); // Start visual 'press down' animation
            ref.current.focus(); // Visually focus the element

            // Wait for the visual "press down" animation to register
            await new Promise(r => setTimeout(r, 150));

            // Release the visual click
            setClicking(false);

            // Wait for the "spring up" release animation
            await new Promise(r => setTimeout(r, 150));

            // Physically trigger actual DOM events after the physical finger release
            if (isMounted && ref.current) ref.current.click();

            await new Promise(r => setTimeout(r, 100));
            return true;
        };

        const typeText = async (field: string, text: string) => {
            let currentStr = "";
            for (let i = 0; i < text.length; i++) {
                if (!isMounted) break;
                currentStr += text[i];
                onFormUpdate(field, currentStr);
                // Realistic typing delay: 15ms-45ms
                await new Promise(r => setTimeout(r, 15 + Math.random() * 30));
            }
        };

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        if (!data) return; // Do nothing until AI data is ready

        const runAnimation = async () => {
            if (!isMounted) return;
            // Initial wait for sidebar to start
            await sleep(1000);
            if (!isMounted) return;

            // Set Priority
            await moveMouseTo(targets.priority);
            await sleep(200);
            await click(targets.priority); // Opens the dropdown menu
            await sleep(400); // Wait for menu to animate in

            if (!isMounted) return;

            if (targets.priorityOption && targets.priorityOption.current) {
                await moveMouseTo(targets.priorityOption);
                await sleep(200);
                await click(targets.priorityOption); // Clicks the specific option
                await sleep(200);
            } else {
                // Fallback if option wasn't rendered
                onFormUpdate("priority", data.priority);
                await sleep(400);
            }

            if (!isMounted) return;

            // Set Component
            await moveMouseTo(targets.component);
            await sleep(200);
            await click(targets.component); // Opens the dropdown menu
            await sleep(400); // Wait for menu to animate in

            if (!isMounted) return;

            if (targets.componentOption && targets.componentOption.current) {
                await moveMouseTo(targets.componentOption);
                await sleep(200);
                await click(targets.componentOption); // Clicks the specific option
                await sleep(200);
            } else {
                // Fallback if option wasn't rendered
                onFormUpdate("component", data.component);
                await sleep(400);
            }

            if (!isMounted) return;

            // Set Title (with realistic typing)
            await moveMouseTo(targets.title);
            await sleep(200);
            await click(targets.title);
            await sleep(100);
            await typeText("title", data.title);
            await sleep(500);

            if (!isMounted) return;

            // Set Description (with realistic typing)
            await moveMouseTo(targets.description);
            await sleep(200);
            await click(targets.description);
            await sleep(100);
            await typeText("description", data.description);
            await sleep(800);

            if (!isMounted) return;

            // Move safely away from the form
            setPos({ x: window.innerWidth / 2, y: window.innerHeight - 50 });
            setTimeout(() => {
                if (isMounted) onComplete();
            }, 1000);
        };

        runAnimation();

        return () => {
            isMounted = false;
        };
    }, [targets, data, onFormUpdate]);

    return (
        <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[100] drop-shadow-lg"
            animate={{
                x: pos.x,
                y: pos.y,
                scale: clicking ? 0.9 : 1,
            }}
            transition={{
                x: { type: "tween", ease: "easeInOut", duration: 0.8 },
                y: { type: "tween", ease: "easeInOut", duration: 0.8 },
                scale: { duration: 0.1 }
            }}
            style={{
                translateX: "-20%", // Adjust cursor center
                translateY: "-10%",
            }}
        >
            <div className="relative">
                <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md" strokeWidth={1.5} />

                {/* Clicking ripple effect */}
                <motion.div
                    className="absolute top-1 left-1 w-6 h-6 rounded-full bg-primary/40"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                        clicking
                            ? { scale: [0, 2], opacity: [0.8, 0] }
                            : { scale: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.4 }}
                />
            </div>
        </motion.div>
    );
}
