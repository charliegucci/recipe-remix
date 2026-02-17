export default defineEventHandler(async (event) => {
  const pathname = getRouterParam(event, 'pathname')
  if (!pathname) {
    throw createError({ statusCode: 400, message: 'Missing pathname' })
  }
  return hubBlob().serve(event, decodeURIComponent(pathname))
})
