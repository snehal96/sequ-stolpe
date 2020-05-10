const { slugify } = require("./src/util/utilfunctions")
const path = require("path")
const author = require("./src/util/authors")
const _ = require("lodash")

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions
  if (node.internal.type === "MarkdownRemark") {
    const slugFromTitle = slugify(node.frontmatter.title)
    createNodeField({
      node,
      name: "slug",
      value: slugFromTitle,
    })
  }
}

exports.createPages = async ({ actions, graphql }) => {
  const { createPage } = actions
  const template = {
    singlePost: path.resolve("src/templates/single-post.js"),
    tagsPage: path.resolve("src/templates/tags-page.js"),
    tagPosts: path.resolve("src/templates/tags-posts.js"),
    postList: path.resolve("src/templates/post-list.js"),
  }

  return graphql(`
    {
      allMarkdownRemark {
        edges {
          node {
            frontmatter {
              author
              tags
            }
            fields {
              slug
            }
          }
        }
      }
    }
  `).then(res => {
    if (res.errors) return Promise.reject(res.errors)

    const posts = res.data.allMarkdownRemark.edges

    posts.forEach(({ node }) => {
      createPage({
        path: node.fields.slug,
        component: template.singlePost,
        context: {
          slug: node.fields.slug,
          imageUrl: author.find(x => x.name === node.frontmatter.author)
            .imageUrl,
        },
      })
    })

    let tags = []
    _.each(posts, edge => {
      if (_.get(edge, "node.frontmatter.tags")) {
        tags = tags.concat(edge.node.frontmatter.tags)
      }
    })

    let tagPostCount = {}
    tags.forEach(tag => {
      tagPostCount[tag] = (tagPostCount[tag] || 0) + 1
    })

    tags = _.uniq(tags)

    createPage({
      path: "/tags",
      component: template.tagsPage,
      context: {
        tags,
        tagPostCount,
      },
    })

    tags.forEach(tag => {
      createPage({
        path: `tags/${slugify(tag)}`,
        component: template.tagPosts,
        context: {
          tag,
        },
      })
    })

    const postPerPage = 2
    const numberOfpage = Math.ceil(posts.length / postPerPage)

    Array.from({ length: numberOfpage }).forEach((_, index) => {
      const isFirstPage = index === 0
      const currentPage = index + 1

      if (isFirstPage) return

      createPage({
        path: `/page/${currentPage}`,
        component: template.postList,
        context: {
          limit: postPerPage,
          skip: index * postPerPage,
          currentPage,
        },
      })
    })
  })
}
