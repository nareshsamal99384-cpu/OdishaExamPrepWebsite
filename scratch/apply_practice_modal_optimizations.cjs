const fs = require('fs');

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
const originalContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '');
const lines = originalContent.split('\n');

// Find the start line dynamically
let startLineIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Configure Practice') && lines[i - 7] && lines[i - 7].includes('p-5 sm:p-7 md:p-9 overflow-y-auto no-scrollbar')) {
    startLineIdx = i - 7;
    break;
  }
}

if (startLineIdx === -1) {
  // Let's search broader
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('p-5 sm:p-7 md:p-9 overflow-y-auto no-scrollbar relative z-10 flex flex-col')) {
      startLineIdx = i;
      break;
    }
  }
}

if (startLineIdx === -1) {
  console.error("Could not find the start of the Configure Practice modal!");
  process.exit(1);
}

console.log("Found modal start at index:", startLineIdx, "Line:", startLineIdx + 1);

// Find the end line of this modal block. It ends with a </div> and before </motion.div>
let endLineIdx = -1;
for (let i = startLineIdx; i < lines.length; i++) {
  if (lines[i].includes('Start Practice Session') && lines[i + 5] && lines[i + 5].trim() === '</div>' && lines[i + 6] && lines[i + 6].trim() === '</motion.div>') {
    endLineIdx = i + 5;
    break;
  }
}

if (endLineIdx === -1) {
  // Broader search for end
  for (let i = startLineIdx; i < lines.length; i++) {
    if (lines[i].includes('</motion.div>') && lines[i - 1].trim() === '</div>' && lines[i - 2].trim() === '</div>') {
      endLineIdx = i - 1;
      break;
    }
  }
}

if (endLineIdx === -1) {
  console.error("Could not find the end of the Configure Practice modal!");
  process.exit(1);
}

console.log("Found modal end at index:", endLineIdx, "Line:", endLineIdx + 1);

// Extract the block
let blockLines = lines.slice(startLineIdx, endLineIdx + 1);
let blockText = blockLines.join('\n');

console.log("Original block length:", blockText.length);

// Perform replacements on the block text
const replacements = [
  // 1. Header padding & icon sizing
  {
    find: `                <div className="p-5 sm:p-7 md:p-9 overflow-y-auto no-scrollbar relative z-10 flex flex-col">
                  <div className="flex justify-between items-start mb-6 md:mb-8 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                        <Dumbbell className="w-6 h-6 text-white animate-[pulse_3s_infinite]" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black premium-text-gradient tracking-tight">Configure Practice</h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">Set your preferences for this session</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPracticeConfig(false)} 
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer border border-slate-200/40"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>`,
    replace: `                <div className="p-4 sm:p-7 md:p-9 overflow-y-auto no-scrollbar relative z-10 flex flex-col">
                  <div className="flex justify-between items-start mb-4 md:mb-8 border-b border-slate-100 pb-3 md:pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 premium-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                        <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-[pulse_3s_infinite]" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-2xl font-black premium-text-gradient tracking-tight">Configure Practice</h3>
                        <p className="text-[11px] sm:text-sm text-slate-500 font-semibold mt-0.5">Set your preferences for this session</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPracticeConfig(false)} 
                      className="p-1.5 sm:p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer border border-slate-200/40"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>`
  },
  // 2. Steps grid gap, card padding and locked states
  {
    find: `                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 mb-6 md:mb-8">
                    {/* Select Exam Card */}
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/2 transition-all duration-300 relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/5 rounded-full blur-lg pointer-events-none" />
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                          Select Exam
                        </label>
                        <span className="text-[9px] font-extrabold text-brand-600 bg-brand-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 1</span>
                      </div>
                      <SearchableSelect
                        value={practiceSettings.examId || ''}
                        onChange={(val) => setPracticeSettings({...practiceSettings, examId: val, category: '', topic: ''})}
                        options={actualExams.map(ex => ({ value: ex.id, label: ex.name }))}
                        placeholder="Choose an exam..."
                        searchPlaceholder="Search exams..."
                        className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>

                    {/* Select Category Card */}
                    <div className={cn(
                      "border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-300 relative group",
                      practiceSettings.examId 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.examId && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.examId ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
                          Select Category
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.examId ? "text-indigo-600 bg-indigo-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 2</span>
                      </div>
                      {!practiceSettings.examId ? (
                        <div className="h-[48px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 text-slate-400 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select an exam first</span>
                          </span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={practiceSettings.category}
                          onChange={(val) => setPracticeSettings({...practiceSettings, category: val, topic: ''})}
                          disabled={!practiceSettings.examId}
                          options={[
                            { value: "topic-wise", label: "Topic-wise Question Bank" },
                            { value: "exam-focused", label: "Exam-Focused Bank" },
                            { value: "revision-sets", label: "Revision Sets" },
                            { value: "pyq-collections", label: "PYQ Collections" },
                          ]}
                          placeholder="Choose a category..."
                          searchPlaceholder="Search categories..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>

                    {/* Select Topic / Unit Card */}
                    <div className={cn(
                      "border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-300 relative group sm:col-span-2 lg:col-span-1",
                      practiceSettings.category 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.category && <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.category ? "bg-purple-500 animate-pulse" : "bg-slate-300")} />
                          Select Topic / Unit
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.category ? "text-purple-600 bg-purple-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 3</span>
                      </div>
                      {!practiceSettings.category ? (
                        <div className="h-[48px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 text-slate-400 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select a category first</span>
                          </span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={practiceSettings.topic}
                          onChange={(val) => setPracticeSettings({...practiceSettings, topic: val})}
                          disabled={!practiceSettings.category}
                          options={(dynamicQuestionBanks[practiceSettings.category] || [])
                            .filter((item: any) => item.examId === practiceSettings.examId && (!item.is_archived || hasAccessTo(item)))
                            .map((item: any) => ({
                              value: item.id,
                              label: \`\${item.title} \${item.isPremium && !hasAccessTo(item) ? '(Premium)' : ''}\`
                            }))}
                          placeholder="Choose a topic..."
                          searchPlaceholder="Search topics..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>
                  </div>`,
    replace: `                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 md:gap-7 mb-5 md:mb-8">
                    {/* Select Exam Card */}
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-3.5 sm:p-4.5 space-y-2.5 sm:space-y-3 flex flex-col justify-between hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/2 transition-all duration-300 relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/5 rounded-full blur-lg pointer-events-none" />
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                          Select Exam
                        </label>
                        <span className="text-[9px] font-extrabold text-brand-600 bg-brand-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 1</span>
                      </div>
                      <SearchableSelect
                        value={practiceSettings.examId || ''}
                        onChange={(val) => setPracticeSettings({...practiceSettings, examId: val, category: '', topic: ''})}
                        options={actualExams.map(ex => ({ value: ex.id, label: ex.name }))}
                        placeholder="Choose an exam..."
                        searchPlaceholder="Search exams..."
                        className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>

                    {/* Select Category Card */}
                    <div className={cn(
                      "border rounded-2xl p-3.5 sm:p-4.5 space-y-2.5 sm:space-y-3 flex flex-col justify-between transition-all duration-300 relative group",
                      practiceSettings.examId 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.examId && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.examId ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
                          Select Category
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.examId ? "text-indigo-650 bg-indigo-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 2</span>
                      </div>
                      {!practiceSettings.examId ? (
                        <div className="h-[48px] rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between px-3 text-slate-400/80 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select an exam first</span>
                          </span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={practiceSettings.category}
                          onChange={(val) => setPracticeSettings({...practiceSettings, category: val, topic: ''})}
                          disabled={!practiceSettings.examId}
                          options={[
                            { value: "topic-wise", label: "Topic-wise Question Bank" },
                            { value: "exam-focused", label: "Exam-Focused Bank" },
                            { value: "revision-sets", label: "Revision Sets" },
                            { value: "pyq-collections", label: "PYQ Collections" },
                          ]}
                          placeholder="Choose a category..."
                          searchPlaceholder="Search categories..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>

                    {/* Select Topic / Unit Card */}
                    <div className={cn(
                      "border rounded-2xl p-3.5 sm:p-4.5 space-y-2.5 sm:space-y-3 flex flex-col justify-between transition-all duration-300 relative group sm:col-span-2 lg:col-span-1",
                      practiceSettings.category 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.category && <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.category ? "bg-purple-500 animate-pulse" : "bg-slate-300")} />
                          Select Topic / Unit
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.category ? "text-purple-600 bg-purple-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 3</span>
                      </div>
                      {!practiceSettings.category ? (
                        <div className="h-[48px] rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between px-3 text-slate-400/80 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select a category first</span>
                          </span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={practiceSettings.topic}
                          onChange={(val) => setPracticeSettings({...practiceSettings, topic: val})}
                          disabled={!practiceSettings.category}
                          options={(dynamicQuestionBanks[practiceSettings.category] || [])
                            .filter((item: any) => item.examId === practiceSettings.examId && (!item.is_archived || hasAccessTo(item)))
                            .map((item: any) => ({
                              value: item.id,
                              label: \`\${item.title} \${item.isPremium && !hasAccessTo(item) ? '(Premium)' : ''}\`
                            }))}
                          placeholder="Choose a topic..."
                          searchPlaceholder="Search topics..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>
                  </div>`
  },
  // 3. Sliders, questions limit text and spacing
  {
    find: `                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Number of Questions
                        </label>
                        {practiceSettings.topic && (
                          <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                            {topicMaxQuestions} Available
                          </span>
                        )}
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-rose-200 bg-rose-50/20 text-rose-500 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center text-rose-400">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          </div>
                          <div className="text-rose-500 font-extrabold text-[11px] uppercase tracking-wider">No questions available yet</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.questions}
                              <span className="text-xs font-semibold text-slate-400">questions</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - {topicMaxQuestions}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max={topicMaxQuestions} 
                              value={practiceSettings.questions}
                              onChange={(e) => setPracticeSettings({...practiceSettings, questions: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
                              <input 
                                type="number" 
                                min="1" 
                                max={topicMaxQuestions} 
                                value={practiceSettings.questions}
                                onChange={(e) => { 
                                  let val = parseInt(e.target.value); 
                                  if (isNaN(val)) val = 1; 
                                  if (val > topicMaxQuestions) val = topicMaxQuestions; 
                                  if (val < 1) val = 1; 
                                  setPracticeSettings({...practiceSettings, questions: val.toString()}); 
                                }}
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Time Limit
                        </label>
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">-</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.timeLimit}
                              <span className="text-xs font-semibold text-slate-400">minutes</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - 180 min
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max="180" 
                              value={practiceSettings.timeLimit}
                              onChange={(e) => setPracticeSettings({...practiceSettings, timeLimit: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
                              <input 
                                type="number" 
                                min="1" 
                                max="180" 
                                value={practiceSettings.timeLimit}
                                onChange={(e) => { 
                                  let val = parseInt(e.target.value); 
                                  if (isNaN(val)) val = 1; 
                                  if (val > 180) val = 180; 
                                  if (val < 1) val = 1; 
                                  setPracticeSettings({...practiceSettings, timeLimit: val.toString()}); 
                                }}
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 md:mt-10 flex justify-center w-full">
                    <Button
                      disabled={!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0}
                      className={cn(
                        "w-full sm:w-auto px-10 sm:px-16 py-4 rounded-2xl text-sm sm:text-base font-black transition-all sm:min-w-[280px] flex items-center justify-center gap-2 cursor-pointer shadow-lg group/btn",
                        (!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0)
                          ? "bg-slate-100 text-slate-400 border border-slate-200/60 shadow-none pointer-events-none cursor-not-allowed"
                          : "premium-gradient text-white hover:premium-glow hover:scale-[1.02] shadow-brand-500/20"
                      )}
                      onClick={handleStartDynamicPractice}
                    >
                      {loadingPractice ? 'Compiling Practice...' : 'Start Practice Session'}
                      <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </div>`,
    replace: `                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-7">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Number of Questions
                        </label>
                        {practiceSettings.topic && (
                          <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                            {topicMaxQuestions} Available
                          </span>
                        )}
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-6 sm:py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all duration-300">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-6 sm:py-9 rounded-2xl border border-dashed border-rose-200 bg-rose-50/20 text-rose-500 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all duration-300">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-rose-50 rounded-full flex items-center justify-center text-rose-400">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          </div>
                          <div className="text-rose-500 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">No questions available yet</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-2 md:mb-4">
                            <span className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.questions}
                              <span className="text-xs font-semibold text-slate-400">questions</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - {topicMaxQuestions}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max={topicMaxQuestions} 
                              value={practiceSettings.questions}
                              onChange={(e) => setPracticeSettings({...practiceSettings, questions: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
                              <input 
                                type="number" 
                                min="1" 
                                max={topicMaxQuestions} 
                                value={practiceSettings.questions}
                                onChange={(e) => { 
                                  let val = parseInt(e.target.value); 
                                  if (isNaN(val)) val = 1; 
                                  if (val > topicMaxQuestions) val = topicMaxQuestions; 
                                  if (val < 1) val = 1; 
                                  setPracticeSettings({...practiceSettings, questions: val.toString()}); 
                                }}
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Time Limit
                        </label>
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-6 sm:py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all duration-300">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-6 sm:py-9 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all duration-300">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">-</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-2 md:mb-4">
                            <span className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.timeLimit}
                              <span className="text-xs font-semibold text-slate-400">minutes</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - 180 min
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max="180" 
                              value={practiceSettings.timeLimit}
                              onChange={(e) => setPracticeSettings({...practiceSettings, timeLimit: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
                              <input 
                                type="number" 
                                min="1" 
                                max="180" 
                                value={practiceSettings.timeLimit}
                                onChange={(e) => { 
                                  let val = parseInt(e.target.value); 
                                  if (isNaN(val)) val = 1; 
                                  if (val > 180) val = 180; 
                                  if (val < 1) val = 1; 
                                  setPracticeSettings({...practiceSettings, timeLimit: val.toString()}); 
                                }}
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 md:mt-10 flex justify-center w-full">
                    <Button
                      disabled={!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0}
                      className={cn(
                        "w-full sm:w-auto px-8 sm:px-16 py-3.5 rounded-2xl text-sm sm:text-base font-black transition-all sm:min-w-[280px] flex items-center justify-center gap-2 cursor-pointer shadow-lg group/btn",
                        (!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0)
                          ? "bg-slate-100 text-slate-400 border border-slate-200/60 shadow-none pointer-events-none cursor-not-allowed"
                          : "premium-gradient text-white hover:premium-glow hover:scale-[1.02] shadow-brand-500/20"
                      )}
                      onClick={handleStartDynamicPractice}
                    >
                      {loadingPractice ? 'Compiling Practice...' : 'Start Practice Session'}
                      <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </div>`
  }
];

let replacedText = blockText;
let matchCount = 0;

for (let r of replacements) {
  const cleanFind = r.find.replace(/\r\n/g, '\n').replace(/\r/g, '').trim();
  const cleanReplace = r.replace.replace(/\r\n/g, '\n').replace(/\r/g, '').trim();
  
  if (replacedText.includes(cleanFind)) {
    replacedText = replacedText.replace(cleanFind, cleanReplace);
    console.log("Successfully replaced a match!");
    matchCount++;
  } else {
    console.error("Match NOT found for replacement index:", matchCount);
  }
}

if (matchCount === replacements.length) {
  // Recompose the entire file
  lines.splice(startLineIdx, endLineIdx - startLineIdx + 1, replacedText);
  const finalContent = lines.join('\n');
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log("SUCCESS: All replacements written to src/App.tsx successfully!");
} else {
  console.error("FAILURE: Some replacements were not found. App.tsx was NOT modified.");
  process.exit(1);
}
