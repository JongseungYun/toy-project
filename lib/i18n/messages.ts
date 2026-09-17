// 화면에 나오는 모든 문구. 노트 내용은 사용자의 것이므로 여기 들어오지 않는다.
//
// {이름} 자리는 format()이 채운다. 언어마다 어순이 다르므로 문장을 조각내지
// 않고 통째로 두고 자리만 비워 둔다.

export interface Messages {
  app: {
    name: string;
    tagline: string;
    version: string;
  };
  auth: {
    signInTitle: string;
    signInLead: string;
    signUpTitle: string;
    signUpLead: string;
    username: string;
    usernameHint: string;
    checkUsername: string;
    usernameFree: string;
    usernameTaken: string;
    password: string;
    passwordConfirm: string;
    ruleLength: string;
    ruleLetters: string;
    ruleDigit: string;
    ruleSymbol: string;
    noRecovery: string;
    submitSignUp: string;
    submitSignIn: string;
    or: string;
    google: string;
    noAccount: string;
    goSignUp: string;
    hasAccount: string;
    goSignIn: string;
  };
  library: {
    title: string;
    root: string;
    folderPath: string;
    newNote: string;
    notes: string;
    folders: string;
    sortBy: string;
    flipOrder: string;
    ascending: string;
    descending: string;
    sortUpdated: string;
    sortCreated: string;
    sortTitle: string;
    emptyTitle: string;
    emptyFolderTitle: string;
    emptyBody: string;
    pickTitle: string;
    pickBody: string;
    backToList: string;
  };
  format: {
    doc: string;
    markdown: string;
    canvas: string;
    docDesc: string;
    markdownDesc: string;
    canvasDesc: string;
    pickerTitle: string;
    pickerLead: string;
    cancel: string;
    untitledDoc: string;
    untitledMarkdown: string;
    untitledCanvas: string;
  };
  note: {
    titleLabel: string;
    bodyLabel: string;
    saving: string;
    saved: string;
    saveFailed: string;
    conflict: string;
    takeRemote: string;
    keepMine: string;
    yesterday: string;
  };
  formatBar: {
    toolbar: string;
    font: string;
    size: string;
    color: string;
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    bulletList: string;
    numberList: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
  };
  markdown: {
    viewer: string;
    source: string;
    placeholder: string;
  };
  draw: {
    toolbar: string;
    pen: string;
    eraser: string;
    rect: string;
    ellipse: string;
    line: string;
    arrow: string;
    text: string;
    strokeWidth: string;
    thin: string;
    normal: string;
    thick: string;
    thickest: string;
    black: string;
    red: string;
    blue: string;
    undo: string;
    surface: string;
    textBoxLabel: string;
    textBoxPlaceholder: string;
  };
  folder: {
    newFolder: string;
    folderName: string;
    create: string;
    cancel: string;
    trashThisFolder: string;
    trashFolderTitle: string;
    trashFolderBody: string;
    sendToTrash: string;
    moveNote: string;
    moveTitle: string;
    moveBody: string;
    currentPlace: string;
    noteCount: string;
    childFolderCount: string;
  };
  trash: {
    title: string;
    empty: string;
    emptyBody: string;
    lead: string;
    emptyTrash: string;
    emptyTrashTitle: string;
    emptyTrashBody: string;
    restore: string;
    purge: string;
    purgeTitle: string;
    purgeBody: string;
    purgeSwept: string;
    sweptCount: string;
    deletedAt: string;
    folder: string;
    trashNoteTitle: string;
    trashNoteBody: string;
    cancel: string;
  };
  background: {
    change: string;
    colors: string;
    images: string;
    upload: string;
    fileLabel: string;
    hint: string;
    rejectType: string;
    rejectSize: string;
    uploadFailed: string;
    sessionLost: string;
    white: string;
    cream: string;
    green: string;
    blue: string;
    pink: string;
    defaultTitle: string;
    defaultLabel: string;
    defaultBody: string;
    defaultPick: string;
    currentDefault: string;
    uploadedImage: string;
  };
  settings: {
    title: string;
    back: string;
    account: string;
    usernameLabel: string;
    usernameBody: string;
    linkedAccount: string;
    linkedBody: string;
    signOut: string;
    signOutBody: string;
    language: string;
    languageLabel: string;
    languageBody: string;
    about: string;
    aboutLabel: string;
    aboutBody: string;
  };
  errors: {
    signInFailed: string;
    signUpFailed: string;
    usernameRule: string;
    passwordRule: string;
    passwordMismatch: string;
  };
}

/** {이름} 자리를 값으로 채운다. */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
