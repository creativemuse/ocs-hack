'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { ASSETS } from '@/lib/config/assets';

export default function Home() {
  const router = useRouter();
  return (
    <div className="bg-[#000000] min-h-screen w-full flex items-start justify-center px-4 py-8 overflow-x-hidden">
      <div className="relative w-full max-w-[390px] md:max-w-[428px]" data-name="home" data-node-id="1:2">
        <div className="absolute bg-[#ffffff] box-border content-stretch flex flex-col gap-[17px] items-start justify-start left-[33px] p-[16px] rounded-2xl top-60 w-[328px] z-10" data-node-id="3:164">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:162">
            <div className="content-stretch flex gap-1 items-center justify-start relative shrink-0" data-node-id="3:326">
              <div className="relative shrink-0 size-8" data-name="ui/flame" data-node-id="3:141">
                <p className="block max-w-none size-full text-2xl">🔥</p>
              </div>
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[12px] text-nowrap" data-node-id="3:111">
                <p className="leading-[normal] whitespace-pre">LIVE BATTLE</p>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[8px] text-nowrap" data-node-id="3:324">
              <p className="leading-[normal] whitespace-pre">05:34 min left to join</p>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full" data-node-id="3:163">
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[24px] w-[294px]" data-node-id="3:157">
              <p className="leading-[normal]">{`100 USDC TOTAL `}</p>
            </div>
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0 w-full" data-node-id="3:161">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[8px] text-nowrap" data-node-id="3:159">
                <p className="leading-[normal] whitespace-pre">JESSE.BASE.ETH 30 OTHER PLAYERS ARE PLAYING</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bg-[#bc58ff] box-border mt-2 content-stretch flex flex-col font-['Audiowide:Regular',_sans-serif] gap-1 items-center justify-center leading-[0] left-[33px] not-italic px-2.5 py-3 rounded-2xl text-[#000000] text-nowrap top-[361px] w-[328px] z-10 cursor-pointer hover:bg-[#a847e6] transition-colors" data-node-id="3:166" onClick={() => router.push('/game')}>
          <div className="relative shrink-0 text-[12px]" data-node-id="3:165">
            <p className="leading-[normal] text-nowrap whitespace-pre">JOIN GAME</p>
          </div>
          {/* <div className="relative shrink-0 text-[8px]" data-node-id="3:173">
            <p className="leading-[normal] text-nowrap whitespace-pre">{` 1 USDC`}</p>
          </div> */}
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[358px] top-[260px] w-[44.091px] z-0 animate-float [animation-delay:200ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:169">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[317px] top-[415px] w-[44.091px] z-0 animate-float2 [animation-delay:500ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:267">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[305px] top-[341px] w-[44.091px] z-0 animate-float3 [animation-delay:800ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:172">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[7px] top-[388px] w-[44.091px] z-0 animate-float [animation-delay:1000ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:261">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[54px] top-[442px] w-[44.091px] z-0 animate-float2 [animation-delay:1200ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:269">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[40.364px] items-center justify-center left-[1.86px] top-[276.82px] w-[40.364px] z-0 animate-float3 [animation-delay:1400ms]">
          <div className="flex-none rotate-[7.451deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:170">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[133px] top-[205px] w-[44.091px] z-0 animate-float [animation-delay:300ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:171">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[229px] top-[401px] w-[44.091px] z-0 animate-float2 [animation-delay:900ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:270">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
            </div>
          </div>
        </div>


        <div className="absolute content-stretch flex flex-col gap-[11px] items-start justify-start left-[33px] top-[557px] w-[328px]" data-node-id="3:214">
          {/* #1 - Trophy */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:205">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:204">
              <div className="content-stretch flex gap-2.5 items-center justify-start relative shrink-0 w-5" data-node-id="3:278">
                <div className="text-yellow-400 text-xl">🏆</div>
              </div>
              <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:203">
                <div className="relative shrink-0 size-9" data-node-id="3:176">
                  <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:177">
                  <p className="leading-[normal] whitespace-pre">JESSE.BASE.ETH</p>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:178">
              <p className="leading-[normal] whitespace-pre">400 USDC</p>
            </div>
          </div>
          {/* #2 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:206">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:277">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:275">
                <p className="leading-[normal]">#2</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:207">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:209">
                  <div className="relative shrink-0 size-9" data-node-id="3:210">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:211">
                    <p className="leading-[normal] whitespace-pre">JD.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:212">
              <p className="leading-[normal] whitespace-pre">380 USDC</p>
            </div>
          </div>
          {/* #3 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:279">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:280">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:281">
                <p className="leading-[normal]">#3</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:282">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:283">
                  <div className="relative shrink-0 size-9" data-node-id="3:284">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:285">
                    <p className="leading-[normal] whitespace-pre">GRROK.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:286">
              <p className="leading-[normal] whitespace-pre">300 USDC</p>
            </div>
          </div>
          {/* #4 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:288">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:289">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:290">
                <p className="leading-[normal]">#4</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:291">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:292">
                  <div className="relative shrink-0 size-9" data-node-id="3:293">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:294">
                    <p className="leading-[normal] whitespace-pre">SIMON.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:295">
              <p className="leading-[normal] whitespace-pre">250 USDC</p>
            </div>
          </div>
          {/* #5 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:297">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:298">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:299">
                <p className="leading-[normal]">#5</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:300">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:301">
                  <div className="relative shrink-0 size-9" data-node-id="3:302">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse8} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:303">
                    <p className="leading-[normal] whitespace-pre">AK.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:304">
              <p className="leading-[normal] whitespace-pre">200 USDC</p>
            </div>
          </div>
          {/* #6 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:306">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:307">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:308">
                <p className="leading-[normal]">#6</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:309">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:310">
                  <div className="relative shrink-0 size-9" data-node-id="3:311">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse9} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:312">
                    <p className="leading-[normal] whitespace-pre">PEPE.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:313">
              <p className="leading-[normal] whitespace-pre">100 USDC</p>
            </div>
          </div>
          {/* #7 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                <p className="leading-[normal]">#7</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                  <div className="relative shrink-0 size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                    <p className="leading-[normal] whitespace-pre">ALICE.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
              <p className="leading-[normal] whitespace-pre">80 USDC</p>
            </div>
          </div>
          {/* #8 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                <p className="leading-[normal]">#8</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                  <div className="relative shrink-0 size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                    <p className="leading-[normal] whitespace-pre">BOB.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
              <p className="leading-[normal] whitespace-pre">60 USDC</p>
            </div>
          </div>
          {/* #9 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                <p className="leading-[normal]">#9</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                  <div className="relative shrink-0 size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                    <p className="leading-[normal] whitespace-pre">CAROL.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
              <p className="leading-[normal] whitespace-pre">40 USDC</p>
            </div>
          </div>
          {/* #10 */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                <p className="leading-[normal]">#10</p>
              </div>
              <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                  <div className="relative shrink-0 size-9">
                  <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                    <p className="leading-[normal] whitespace-pre">DAVE.BASE.ETH</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
              <p className="leading-[normal] whitespace-pre">20 USDC</p>
            </div>
          </div>
        </div>
        <div className="absolute font-['Audiowide:Regular',_sans-serif] leading-[0] left-[33px] not-italic text-[#ffffff] text-[12px] text-nowrap top-[523px]" data-node-id="3:260">
          <p className="leading-[normal] whitespace-pre">TOP EARNERS</p>
        </div>
        <div className="absolute flex h-[45.938px] items-center justify-center left-[119px] top-[412px] w-[45.938px] z-0 animate-float3 [animation-delay:1600ms]">
          <div className="flex-none rotate-[19.462deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:264">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[45.938px] items-center justify-center left-[297px] top-[203px] w-[45.938px] z-0 animate-float [animation-delay:1800ms]">
          <div className="flex-none rotate-[19.462deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:268">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute content-stretch flex flex-col gap-[19px] items-center justify-start left-1/2 top-[94px] translate-x-[-50%] w-[185px]" data-node-id="3:327">
          <div className="h-7 relative shrink-0 w-[185px] flex items-center justify-center" data-name="BEATME Title" data-node-id="3:273">
            <h1 className="text-white text-4xl font-audiowide tracking-wider">
              BEATME
            </h1>
          </div>
          <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-center w-[130px]" data-node-id="3:266">
            <p className="leading-[normal]">Name that tune, win your reward.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
