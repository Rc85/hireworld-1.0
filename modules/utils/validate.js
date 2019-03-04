module.exports = {
    usernameCheck: /^[a-zA-Z0-9_-]{5,25}$/,
    passwordCheck: /^.{6,20}$/,
    emailCheck: /^[a-zA-Z0-9_\-]+(\.{1}[a-zA-Z0-9_\-]*){0,2}@{1}[a-zA-Z0-9_\-]+\.([a-zA-Z0-9_\-]*\.{1}){0,2}[a-zA-Z0-9_\-]{2,}$/,
    nameCheck: /^[a-zA-Z]{1,40}$/,
    fullNameCheck: /^[a-zA-Z]*\s[a-zA-Z]*$/,
    blankCheck: /^\s*$/,
    titleCheck: /^[a-zA-Z0-9!@#$%^&*()_+-='";:[\].,\/?\\~`\s]*$/,
    priceCheck: /^[0-9]{1,7}.?[0-9]{0,2}$/,
    businessNameCheck: /^(\w|\d|\s(?!\s)|,|\.|\/|\?|;|'|\[|\]|!|@|#|\$|%|\^|&|\*|\(|\)|_|\+|-|=|{|}|:|"){3,40}$/,
    addressCheck: /^(\w|\d|\s(?!\s)|,|\.|\/|\?|;|'|\[|\]|!|@|#|\$|%|\^|&|\*|\(|\)|_|\+|-|=|{|}|:|"){1,300}$/,
    cityCodeCheck: /^([0-9]{1,5}|[a-zA-Z]{1}[0-9]{1}[a-zA-Z]{1}(\s)?[0-9]{1}[a-zA-Z]{1}[0-9]{1})$/,
    phoneCheck: /^(\+1)?(\s)?([0-9]{1,15}|(\()?[0-9]{3}(\))?(\s|\-)?([0-9]{7,12}|[0-9]{3}(\s|\-)?[0-9]{4,9}))$/,
    locationCheck: /^[a-zA-Z0-9À-ž,'().\-\s]*$/,
    urlCheck: /^(http:\/\/|https:\/\/)?(www\.)?[a-zA-Z0-9\-]*.[a-zA-Z]{0,5}([a-zA-Z0-9\-\/]*)/,
    userTitleCheck: /^[a-zA-Z0-9À-ž,'().\-\s]{3,30}$/,
    dobYearCheck: /^(1|2){1}[0-9]{3}$/,
    currencyCheck: /^[a-zA-Z]{3}$/
}