import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es', 'fr'],
 
  // Used when no locale matches
  defaultLocale: 'en',

  // The `localePrefix` option is used to prefix paths with a locale
  // when the user visits the root of the website.
  // This is important for SEO and for the language switcher to work correctly.
  localePrefix: 'always'
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ]
};
