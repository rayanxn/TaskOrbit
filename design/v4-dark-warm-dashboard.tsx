/**
 * from Paper — v4 Dark Warm Dashboard
 * Dark warm variant of dashboard
 *
 * Dark Mode Color Mapping (Light → Dark Warm):
 *   --color-background:    #F6F5F1 → #1A1918
 *   --color-surface:       #FFFFFF → #222120
 *   --color-surface-hover: #FAF8F5 → #2A2927
 *   --color-border:        #E8E4DE → #2E2D2A
 *   --color-border-strong: #D6CFC7 → #3D3B38
 *   --color-text:          #2D2A26 → #E8E5E0
 *   --color-text-secondary:#9C9689 → #8A857D
 *   --color-text-muted:    #B8B3AB → #5C5852
 *   --color-primary:       #2E2E2C → #E8E5E0
 *   --color-accent:        #C2410C → #E8622C
 *   --color-danger:        #C4483E → #D4554B
 *   --color-warning:       #D4853D → #E0914A
 *   --color-success:       #4A7A5C → #5A8A6C
 *   --color-purple:        #7B6B96 → #8B7BA6
 *   sidebar-bg:            #F6F5F1 → #161514 (darker for depth)
 */
export default function V4DarkWarmDashboard() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-360 h-225 bg-[#1A1918] antialiased text-xs/4">
      <div className="flex flex-col w-65 h-full shrink-0 py-6 px-5 border-r border-r-solid border-r-[#E8E5E00F]">
        <div className="flex items-center pb-7 gap-2.5">
          <div className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-[#E8E5E0] shrink-0">
            <div className="inline-block [white-space-collapse:preserve] text-wrap text-[#1A1918] font-['SpaceGrotesk-SemiBold','Space_Grotesk',system-ui,sans-serif] font-semibold text-[13px]/4">
              F
            </div>
          </div>
          <div className="flex flex-col gap-px">
            <div className="inline-block [white-space-collapse:preserve] text-wrap text-[#E8E5E0] font-['SpaceGrotesk-SemiBold','Space_Grotesk',system-ui,sans-serif] font-semibold text-[15px]/4.5">
              Flowboard
            </div>
            <div className="opacity-[0.3] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
              Acme Inc
            </div>
          </div>
        </div>
        <div className="flex flex-col pb-6 gap-0.5">
          <div className="flex items-center justify-between rounded-lg py-2 px-3">
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4l6 4 6-4" stroke="#6B676259" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="#6B676259" strokeWidth="1.2" />
              </svg>
              <div className="opacity-[0.45] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
                Inbox
              </div>
            </div>
            <div className="flex items-center justify-center rounded-[100px] py-0.5 px-1.75 bg-[#A04D58]">
              <div className="inline-block [white-space-collapse:preserve] text-wrap text-[#FFFFFF] font-['JetBrains_Mono',system-ui,sans-serif] font-medium text-[10px]/3">
                3
              </div>
            </div>
          </div>
          <div className="flex items-center rounded-lg py-2 px-3 gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#6B676259" strokeWidth="1.2" />
              <path d="M5.5 8l2 2 3-4" stroke="#6B676259" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="opacity-[0.45] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
              My Issues
            </div>
          </div>
          <div className="flex items-center rounded-lg py-2 px-3 gap-2.5 opacity-[0.45]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="#6B6762" strokeWidth="1.2" />
              <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="#6B6762" strokeWidth="1.2" />
              <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="#6B6762" strokeWidth="1.2" />
              <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="#6B6762" strokeWidth="1.2" />
            </svg>
            <div className="inline-block [white-space-collapse:preserve] [text-wrap:initial] opacity-[1] text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
              Projects
            </div>
          </div>
          <div className="flex items-center rounded-lg py-2 px-3 gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="2" rx="1" stroke="#6B676259" strokeWidth="1.2" />
              <rect x="2" y="7" width="12" height="2" rx="1" stroke="#6B676259" strokeWidth="1.2" />
              <rect x="2" y="11" width="8" height="2" rx="1" stroke="#6B676259" strokeWidth="1.2" />
            </svg>
            <div className="opacity-[0.45] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
              Views
            </div>
          </div>
          <div className="flex items-center rounded-lg py-2 px-3 gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="6" r="2.5" stroke="#6B676259" strokeWidth="1.2" />
              <circle cx="11" cy="6" r="2" stroke="#6B676259" strokeWidth="1.2" />
              <path d="M1 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5" stroke="#6B676259" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <div className="opacity-[0.45] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
              Teams
            </div>
          </div>
          <div className="flex items-center rounded-lg py-2 px-3 gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6762" strokeWidth="2">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            <div className="opacity-[0.45] inline-block text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
              Analytics
            </div>
          </div>
          <div className="flex items-center -order-10 rounded-lg py-2 px-3 gap-2.5 border-l-2 border-l-solid border-l-[#E8E5E0]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8E5E0" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="4" rx="1" />
              <rect x="3" y="14" width="7" height="4" rx="1" />
              <rect x="14" y="11" width="7" height="7" rx="1" />
            </svg>
            <div className="inline-block text-[#E8E5E0] font-['JetBrains_Mono',system-ui,sans-serif] font-medium text-[13px]/4">
              Dashboard
            </div>
          </div>
        </div>
        <div className="w-full h-px bg-[#E8E5E00F] shrink-0" />
        <div className="flex flex-col pt-5 gap-3">
          <div className="opacity-[0.5] tracking-widest pl-3 inline-block [white-space-collapse:preserve] [text-wrap:initial] text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] font-medium text-[10px]/3">
            PROJECTS
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center py-1.5 px-3 gap-2.5">
              <div className="shrink-0 rounded-[100px] bg-[#7B7B70] size-1.5" />
              <div className="opacity-[0.5] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
                Frontend v2.4
              </div>
            </div>
            <div className="flex items-center py-1.5 px-3 gap-2.5">
              <div className="shrink-0 rounded-[100px] bg-[#5C5852] size-1.5" />
              <div className="opacity-[0.5] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
                API Platform
              </div>
            </div>
            <div className="flex items-center py-1.5 px-3 gap-2.5">
              <div className="shrink-0 rounded-[100px] bg-[#E8E5E0] size-1.5" />
              <div className="opacity-[0.5] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
                Design System
              </div>
            </div>
            <div className="flex items-center py-1.5 px-3 gap-2.5">
              <div className="shrink-0 rounded-[100px] bg-[#A04D58] size-1.5" />
              <div className="opacity-[0.5] inline-block [white-space-collapse:preserve] text-wrap text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
                Mobile App
              </div>
            </div>
          </div>
        </div>
        <div className="grow h-81.5 shrink-0" />
        <div className="flex items-center rounded-lg py-2 px-3 gap-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.86 1.33h2.28l.32 1.93.76.32 1.64-1.06 1.62 1.62-1.06 1.64.32.76 1.93.32v2.28l-1.93.32-.32.76 1.06 1.64-1.62 1.62-1.64-1.06-.76.32-.32 1.93H6.86l-.32-1.93-.76-.32-1.64 1.06-1.62-1.62 1.06-1.64-.32-.76-1.93-.32V6.86l1.93-.32.32-.76-1.06-1.64 1.62-1.62 1.64 1.06.76-.32.32-1.93z" stroke="#6B6762" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="2" stroke="#6B6762" strokeWidth="1.2" />
          </svg>
          <div className="opacity-[0.45] inline-block text-[#6B6762] font-['JetBrains_Mono',system-ui,sans-serif] text-[13px]/4">
            Settings
          </div>
        </div>
      </div>
      <div className="flex flex-col grow shrink basis-[0%] h-full">
        <div className="flex items-center justify-between w-full shrink-0 pt-6 px-10">
          <div className="flex flex-col gap-0.5">
            <div className="tracking-[0.04em] inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[13px]/4">
              TUESDAY, MAR 18
            </div>
            <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-SemiBold','Space_Grotesk',system-ui,sans-serif] font-semibold text-2xl/7.5">
              Good morning, Marcus
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg py-2 px-4 gap-2 bg-[#2A2927]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A857D" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[13px]/4">
                Search...
              </div>
              <div className="inline-block rounded-sm py-0.5 px-1.5 bg-[#3D3B38]">
                <div className="inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  {"\u2318"}K
                </div>
              </div>
            </div>
            <div className="rounded-[50%] bg-[#5C5852] shrink-0 size-8" />
          </div>
        </div>
        <div className="flex items-center w-full shrink-0 pt-6 gap-6 px-10">
          <div className="flex items-center grow rounded-xl py-5 px-6 gap-6 bg-[#222120] border border-solid border-[#2E2D2A]">
            <div className="flex items-center justify-center w-13 h-13 shrink-0">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="#2E2D2A" strokeWidth="4" />
                <circle cx="26" cy="26" r="22" fill="none" stroke="#E8E5E0" strokeWidth="4" strokeDasharray="94 44" strokeLinecap="round" transform="rotate(-90 26 26)" />
                <text x="26" y="28" textAnchor="middle" fontFamily="Space Grotesk" fontSize="13" fontWeight="600" fill="#E8E5E0">
                  68%
                </text>
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-SemiBold','Space_Grotesk',system-ui,sans-serif] font-semibold text-base/5">
                Sprint 24
              </div>
              <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[13px]/4">
                3 days remaining · Mar 4 – Mar 18
              </div>
            </div>
            <div className="w-px h-9 shrink-0 bg-[#2E2D2A]" />
            <div className="flex flex-col grow gap-2.5">
              <div className="tracking-[0.04em] inline-block text-[#8A857D] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                ISSUES BY STATUS
              </div>
              <div className="flex w-full h-2 rounded-sm overflow-clip shrink-0">
                <div className="grow-3 bg-[#E8E5E0]" />
                <div className="grow-2 bg-[#8A857D]" />
                <div className="grow-[1.5] bg-[#5C5852]" />
                <div className="grow bg-[#2E2D2A]" />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.25">
                  <div className="shrink-0 rounded-[3px] bg-[#E8E5E0] size-1.5" />
                  <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Done 8
                  </div>
                </div>
                <div className="flex items-center gap-1.25">
                  <div className="shrink-0 rounded-[3px] bg-[#8A857D] size-1.5" />
                  <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Review 3
                  </div>
                </div>
                <div className="flex items-center gap-1.25">
                  <div className="shrink-0 rounded-[3px] bg-[#5C5852] size-1.5" />
                  <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    In Progress 5
                  </div>
                </div>
                <div className="flex items-center gap-1.25">
                  <div className="shrink-0 rounded-[3px] bg-[#2E2D2A] size-1.5" />
                  <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Todo 4
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex grow w-full pt-6 pb-8 gap-6 px-10">
          <div className="flex flex-col grow-[1.6] basis-[0%] gap-4">
            <div className="flex items-center justify-between">
              <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-SemiBold','Space_Grotesk',system-ui,sans-serif] font-semibold text-base/5">
                My Focus
              </div>
              <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4">
                {"View all \u2192"}
              </div>
            </div>
            <div className="flex flex-col rounded-[10px] overflow-clip gap-px grow-0 bg-[#2E2D2A]">
              <div className="flex items-center py-3.5 px-4 gap-3 bg-[#222120]">
                <div className="shrink-0 rounded-sm bg-[#D4554B] size-2" />
                <div className="shrink-0 w-14 inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  FLO-139
                </div>
                <div className="grow inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-sm/4.5">
                  Migrate user settings to new API schema
                </div>
                <div className="flex items-center shrink-0 gap-1.5">
                  <div className="inline-block text-[#D4554B] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                    P0
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Today
                  </div>
                </div>
              </div>
              <div className="flex items-center py-3.5 px-4 gap-3 bg-[#222120]">
                <div className="shrink-0 rounded-sm bg-[#D4554B] size-2" />
                <div className="shrink-0 w-14 inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  FLO-142
                </div>
                <div className="grow inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-sm/4.5">
                  Fix auth token refresh on expired sessions
                </div>
                <div className="flex items-center shrink-0 gap-1.5">
                  <div className="inline-block text-[#D4554B] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                    P0
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Today
                  </div>
                </div>
              </div>
              <div className="flex items-center py-3.5 px-4 gap-3 bg-[#222120]">
                <div className="shrink-0 rounded-sm bg-[#E0914A] size-2" />
                <div className="shrink-0 w-14 inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  FLO-136
                </div>
                <div className="grow inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-sm/4.5">
                  Redesign project settings panel
                </div>
                <div className="flex items-center shrink-0 gap-1.5">
                  <div className="inline-block text-[#E0914A] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                    P1
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Mar 19
                  </div>
                </div>
              </div>
              <div className="flex items-center py-3.5 px-4 gap-3 bg-[#222120]">
                <div className="shrink-0 rounded-sm bg-[#E0914A] size-2" />
                <div className="shrink-0 w-14 inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  FLO-145
                </div>
                <div className="grow inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-sm/4.5">
                  Add keyboard shortcuts for board navigation
                </div>
                <div className="flex items-center shrink-0 gap-1.5">
                  <div className="inline-block text-[#E0914A] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                    P1
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Mar 20
                  </div>
                </div>
              </div>
              <div className="flex items-center py-3.5 px-4 gap-3 bg-[#222120]">
                <div className="shrink-0 rounded-sm bg-[#8A9A7C] size-2" />
                <div className="shrink-0 w-14 inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  FLO-148
                </div>
                <div className="grow inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-sm/4.5">
                  Implement sprint completion flow
                </div>
                <div className="flex items-center shrink-0 gap-1.5">
                  <div className="inline-block text-[#8A9A7C] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                    P2
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Mar 21
                  </div>
                </div>
              </div>
              <div className="flex items-center py-3.5 px-4 gap-3 bg-[#222120]">
                <div className="shrink-0 rounded-sm bg-[#8A9A7C] size-2" />
                <div className="shrink-0 w-14 inline-block text-[#5C5852] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
                  FLO-151
                </div>
                <div className="grow inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-sm/4.5">
                  Update team workload query for new schema
                </div>
                <div className="flex items-center shrink-0 gap-1.5">
                  <div className="inline-block text-[#8A9A7C] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[11px]/3.5">
                    P2
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Mar 22
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col grow basis-[0%] gap-4">
            <div className="flex items-center justify-between">
              <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-SemiBold','Space_Grotesk',system-ui,sans-serif] font-semibold text-base/5">
                Recent Activity
              </div>
              <div className="inline-block text-[#8A857D] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4">
                {"Inbox \u2192"}
              </div>
            </div>
            <div className="flex flex-col rounded-[10px] overflow-clip gap-px grow-0 bg-[#2E2D2A]">
              <div className="flex items-start py-3.5 px-4 gap-2.5 bg-[#222120]">
                <div className="shrink-0 rounded-[14px] bg-[#2E2D2A] size-7" />
                <div className="flex flex-col grow gap-0.75">
                  <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4.25">
                    Sarah moved FLO-134 to Done
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Frontend v2.4 · 12m ago
                  </div>
                </div>
              </div>
              <div className="flex items-start py-3.5 px-4 gap-2.5 bg-[#222120]">
                <div className="shrink-0 rounded-[14px] bg-[#2E2D2A] size-7" />
                <div className="flex flex-col grow gap-0.75">
                  <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4.25">
                    Alex assigned you FLO-148
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    API Platform · 34m ago
                  </div>
                </div>
              </div>
              <div className="flex items-start py-3.5 px-4 gap-2.5 bg-[#222120]">
                <div className="shrink-0 rounded-[14px] bg-[#2E2D2A] size-7" />
                <div className="flex flex-col grow gap-0.75">
                  <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4.25">
                    Jordan created FLO-152
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Design System · 1h ago
                  </div>
                </div>
              </div>
              <div className="flex items-start py-3.5 px-4 gap-2.5 bg-[#222120]">
                <div className="shrink-0 rounded-[14px] bg-[#2E2D2A] size-7" />
                <div className="flex flex-col grow gap-0.75">
                  <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4.25">
                    Maya moved FLO-129 to In Review
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Frontend v2.4 · 2h ago
                  </div>
                </div>
              </div>
              <div className="flex items-start py-3.5 px-4 gap-2.5 bg-[#222120]">
                <div className="shrink-0 rounded-[14px] bg-[#2E2D2A] size-7" />
                <div className="flex flex-col grow gap-0.75">
                  <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4.25">
                    You completed FLO-131
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    API Platform · 3h ago
                  </div>
                </div>
              </div>
              <div className="flex items-start py-3.5 px-4 gap-2.5 bg-[#222120]">
                <div className="shrink-0 rounded-[14px] bg-[#2E2D2A] size-7" />
                <div className="flex flex-col grow gap-0.75">
                  <div className="inline-block text-[#E8E5E0] font-['SpaceGrotesk-Medium','Space_Grotesk',system-ui,sans-serif] font-medium text-[13px]/4.25">
                    Sarah started Sprint 24
                  </div>
                  <div className="inline-block text-[#5C5852] font-['SpaceGrotesk-Regular','Space_Grotesk',system-ui,sans-serif] text-[11px]/3.5">
                    Frontend v2.4 · Yesterday
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
